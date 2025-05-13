# api/views.py
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import *
from .serializers import *
from .auth_helpers import authenticate_user, check_permission
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import model_from_json
from django.utils import timezone
from .gdrive_helper import GoogleDriveHelper
import time
from django.core.files.uploadhandler import TemporaryFileUploadHandler
from django.conf import settings
import os
import requests
from django.http import StreamingHttpResponse
from urllib.parse import unquote
from .models import Users

@api_view(['GET'])
def proxy_download(request):
    """Proxy downloads from Google Drive to handle CORS"""
    url = request.GET.get('url')
    user_id = request.GET.get('user_id')
    
    if not url or not user_id:
        return Response({'message': 'URL and user_id parameters are required'}, status=400)
    
    try:
        # Get user's Google Drive config
        user = Users.objects.get(user_id=user_id)
        gdrive_config = user.gdrive
        
        if not gdrive_config or not gdrive_config.get('refresh_token'):
            return Response({'message': 'Google Drive not configured for user'}, status=400)
        
        # Get a new access token using refresh token
        token_url = 'https://oauth2.googleapis.com/token'
        token_data = {
            'client_id': gdrive_config['client_id'],
            'client_secret': gdrive_config['client_secret'],
            'refresh_token': gdrive_config['refresh_token'],
            'grant_type': 'refresh_token'
        }
        
        token_response = requests.post(token_url, data=token_data)
        if not token_response.ok:
            return Response({'message': 'Failed to refresh access token'}, status=401)
        
        access_token = token_response.json()['access_token']
        
        # Decode the URL if it's encoded
        decoded_url = unquote(url)
        
        # Make the request to Google Drive
        response = requests.get(
            decoded_url,
            stream=True,
            headers={
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json'
            }
        )
        
        # Check if the request was successful
        if response.status_code != 200:
            return Response(
                {'message': f'Failed to fetch file: {response.status_code}'},
                status=response.status_code
            )
        
        # Create a streaming response
        streaming_response = StreamingHttpResponse(
            response.iter_content(chunk_size=8192),
            content_type=response.headers.get('content-type', 'application/octet-stream')
        )
        
        # Add CORS headers
        streaming_response['Access-Control-Allow-Origin'] = '*'
        streaming_response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        streaming_response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        
        # Add content disposition header if available
        if 'content-disposition' in response.headers:
            streaming_response['Content-Disposition'] = response.headers['content-disposition']
        
        return streaming_response
        
    except Users.DoesNotExist:
        return Response({'message': 'User not found'}, status=404)
    except Exception as e:
        print(f"Proxy download error: {str(e)}")
        return Response(
            {'message': f'Failed to proxy download: {str(e)}'},
            status=500
        )

@api_view(['POST'])
def setup_gdrive(request):
    """Setup Google Drive configuration for a user"""
    user_id = request.data.get('user_id')
    gdrive_config = request.data.get('gdrive')
    
    if not user_id or not gdrive_config:
        return Response({'message': 'Missing required data'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = Users.objects.get(user_id=user_id)
        user.gdrive = gdrive_config
        user.save()
        return Response({'success': True})
    except Users.DoesNotExist:
        return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_gdrive_config(request):
    """Get Google Drive configuration for a user"""
    user_id = request.query_params.get('user_id')
    if not user_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = Users.objects.get(user_id=user_id)
        return Response({
            'gdrive': user.gdrive or {}
        })
    except Users.DoesNotExist:
        return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        user = authenticate_user(username, password)
        if user:
            user_serializer = UserSerializer(user)
            return Response({
                'user': user_serializer.data,
                'message': 'Login successful'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'message': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def get_users(request):
    admin_id = request.query_params.get('admin_id')
    if not admin_id:
        return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be Admin)
    if not check_permission(admin_id, 'Admin'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get all users except the requesting admin
        users = Users.objects.exclude(user_id=admin_id).order_by('username')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def upload_model_weights(request):
    """Handle model file upload to Google Drive"""
    admin_id = request.query_params.get('admin_id')
    if not admin_id:
        return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not check_permission(admin_id, 'Admin'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get admin's Google Drive configuration
        admin = Users.objects.get(user_id=admin_id)
        gdrive_config = admin.gdrive

        if not gdrive_config or not gdrive_config.get('models_url'):
            return Response({'message': 'Google Drive models folder not configured'}, status=status.HTTP_400_BAD_REQUEST)

        # Initialize Google Drive helper
        gdrive = GoogleDriveHelper(
            client_id=gdrive_config['client_id'],
            client_secret=gdrive_config['client_secret'],
            refresh_token=gdrive_config['refresh_token']
        )
        gdrive.authenticate()

        # Get the uploaded file
        if 'file' not in request.FILES:
            return Response({'message': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        
        # Validate file extension
        if not file.name.endswith('.h5'):
            return Response({'message': 'Invalid file format. Must be .h5'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Upload to Google Drive and get shared URL
        result = gdrive.upload_file(
            file_content=file.read(),
            filename=f'model_{int(time.time())}.h5',
            folder_url=gdrive_config['models_url']
        )

        if not result or 'weights_url' not in result:
            return Response({'message': 'Failed to upload to Google Drive'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(result, status=status.HTTP_200_OK)

    except Users.DoesNotExist:
        return Response({'message': 'Admin not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error uploading to Google Drive: {str(e)}")
        return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_model(request, model_id=None):
    # Check if user_id is provided in request
    user_id = request.query_params.get('user_id')
    if not user_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be at least Member)
    if not check_permission(user_id, 'Member'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get specific model if model_id provided, otherwise get all models
    try:
        if model_id:
            model = Models.objects.get(model_id=model_id)
            serializer = ModelDetailSerializer(model)
            return Response(serializer.data)
        else:
            # Get all models without filtering
            models = Models.objects.all().order_by('-version')
            serializer = ModelListSerializer(models, many=True)
            return Response(serializer.data)
    except Models.DoesNotExist:
        return Response({'message': 'Model not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_model_weights(request, model_id):
    """Get model weights"""
    user_id = request.query_params.get('user_id')
    if not user_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not check_permission(user_id, 'Member'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        model = Models.objects.get(model_id=model_id)
        return Response({'weights': model.weights})
    except Models.DoesNotExist:
        return Response({'message': 'Model not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def review_contributions(request):
    admin_id = request.query_params.get('admin_id')
    if not admin_id:
        return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be Admin)
    if not check_permission(admin_id, 'Admin'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get all contributions without filtering
        contributions = Contributions.objects.all().order_by('-upload_date')
        serializer = ContributionListSerializer(contributions, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'message': f'Failed to fetch contributions: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
def delete_model(request, model_id):
    """Delete a specific model"""
    admin_id = request.query_params.get('admin_id')
    if not admin_id:
        return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be Admin)
    if not check_permission(admin_id, 'Admin'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # First check if the model exists
        model = Models.objects.get(model_id=model_id)
        
        # Delete any associated records in a transaction
        from django.db import transaction
        with transaction.atomic():
            # Delete associated contributions first
            Contributions.objects.filter(model=model).delete()
            
            # Delete associated contribution-to-model relationships
            ContributionToModel.objects.filter(model=model).delete()
            
            # Delete associated comments
            Comments.objects.filter(model=model).delete()
            
            # Delete associated ratings
            Ratings.objects.filter(model=model).delete()
            
            # Finally delete the model
            model.delete()
        
        return Response({'message': 'Model deleted successfully'}, status=status.HTTP_200_OK)
    except Models.DoesNotExist:
        return Response({'message': 'Model not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error deleting model: {str(e)}")  # Add logging
        return Response(
            {'message': f'Failed to delete model: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def rate_model(request):
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be at least Member)
    if not check_permission(user_id, 'Member'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = RatingSerializer(data=request.data)
    if serializer.is_valid():
        # Check if user has already rated this model
        existing_rating = Ratings.objects.filter(
            user_id=serializer.validated_data['user'].user_id,
            model_id=serializer.validated_data['model'].model_id
        ).first()
        
        if existing_rating:
            # Update existing rating
            existing_rating.rating = serializer.validated_data['rating']
            existing_rating.save()
            updated_serializer = RatingSerializer(existing_rating)
            return Response(updated_serializer.data, status=status.HTTP_200_OK)
        else:
            # Create new rating
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def comment_on_model(request):
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be at least Member)
    if not check_permission(user_id, 'Member'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = CommentSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def get_model_comments(request, model_id):
    """
    Get all comments for a specific model.
    For regular users, only return approved comments.
    For admins, return all comments.
    """
    user_id = request.query_params.get('user_id')
    if not user_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check if user exists and is active
        user = Users.objects.get(user_id=user_id, is_active=True)
        
        # Get comments for the model
        if user.role_id == 4:  # Admin
            comments = Comments.objects.filter(model_id=model_id)
        else:  # Regular users only see approved comments
            comments = Comments.objects.filter(model_id=model_id, is_approved=True)
        
        # Include user information in the response
        comments_data = []
        for comment in comments:
            comment_data = {
                'comment_id': comment.comment_id,
                'user': {
                    'user_id': comment.user.user_id,
                    'username': comment.user.username
                },
                'model_id': comment.model_id,
                'comment_text': comment.comment_text,
                'comment_date': comment.comment_date,
                'is_approved': comment.is_approved
            }
            comments_data.append(comment_data)
        
        return Response(comments_data)
    except Users.DoesNotExist:
        return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET', 'PUT', 'DELETE'])
def manage_model_detail(request, model_id):
    """Handle GET, PUT and DELETE requests for a specific model"""
    try:
        model = Models.objects.get(model_id=model_id)
    except Models.DoesNotExist:
        return Response({'message': 'Model not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not check_permission(user_id, 'Member'):
            return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ModelDetailSerializer(model)
        return Response(serializer.data)

    elif request.method == 'PUT':
        admin_id = request.data.get('admin_id')
        if not admin_id:
            return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not check_permission(admin_id, 'Admin'):
            return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ModelDetailSerializer(model, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        admin_id = request.query_params.get('admin_id')
        if not admin_id:
            return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not check_permission(admin_id, 'Admin'):
            return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        model.delete()
        return Response({'message': 'Model deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
def predict_image(request):
    """Process image and return prediction"""
    try:
        # Get model ID from request
        model_id = request.data.get('model_id')
        if not model_id:
            return Response({'message': 'Model ID required'}, status=status.HTTP_400_BAD_REQUEST)

        # Get the image file from request
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'message': 'Image file required'}, status=status.HTTP_400_BAD_REQUEST)

        # Get the model
        try:
            model_obj = Models.objects.get(model_id=model_id)
        except Models.DoesNotExist:
            return Response({'message': 'Model not found'}, status=status.HTTP_404_NOT_FOUND)

        # Convert image to array
        import tensorflow as tf
        import numpy as np
        from PIL import Image
        import io

        # Read image file
        image = Image.open(io.BytesIO(image_file.read()))
        
        # Resize and convert to array
        image = image.resize((128, 128))
        image_arr = tf.keras.preprocessing.image.img_to_array(image)
        image_arr = np.array([image_arr])  # Add batch dimension

        # Get model data
        model_data = model_obj.weights
        
        try:
            # Create a Sequential model with the layers from the config
            model = tf.keras.Sequential()
            
            # Add layers based on the architecture
            config = json.loads(model_data['architecture'])
            for layer_config in config['config']['layers']:
                if layer_config['class_name'] == 'InputLayer':
                    continue  # Skip input layer as it's implicit
                
                # Get layer class from tf.keras.layers
                layer_class = getattr(tf.keras.layers, layer_config['class_name'])
                # Create and add layer
                layer = layer_class.from_config(layer_config['config'])
                model.add(layer)

            # Load weights
            weights = [np.array(w) for w in model_data['weights']]
            model.set_weights(weights)

        except Exception as e:
            print(f"Error building model: {str(e)}")
            return Response(
                {'message': 'Error building model'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Make prediction
        prediction = model.predict(image_arr)
        predicted_class = np.argmax(prediction[0])

        # Define labels
        labels = {
            0: "glioma",
            1: "meningioma", 
            2: "no tumor",
            3: "pituitary"
        }

        # Get confidence scores
        confidence_scores = {
            label: float(score) 
            for label, score in zip(labels.values(), prediction[0])
        }

        return Response({
            'prediction': labels[predicted_class],
            'confidence_scores': confidence_scores
        })

    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return Response(
            {'message': 'Error processing image'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_notifications(request):
    user_id = request.query_params.get('user_id')
    if not user_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be at least Member)
    if not check_permission(user_id, 'Member'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get notifications for the user through the junction table
        notifications = Notifications.objects.filter(
            notificationtouser__user_id=user_id
        ).order_by('-sent_date')
        
        # Get read status for each notification
        notifications_data = []
        for notification in notifications:
            notification_user = NotificationToUser.objects.get(
                notification=notification,
                user_id=user_id
            )
            notification_data = NotificationSerializer(notification).data
            notification_data['is_read'] = notification_user.is_read
            notifications_data.append(notification_data)
        
        return Response(notifications_data)
    except Exception as e:
        return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['POST'])
def create_notification(message, user_id):
    try:
        # Create the notification
        notification = Notifications.objects.create(message=message)
        
        # Create the user-notification relationship
        NotificationToUser.objects.create(
            notification=notification,
            user_id=user_id,
            is_read=False
        )
        return True
    except Exception:
        return False
    
@api_view(['PUT'])
def mark_notification_read(request, notification_id):
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        notification_user = NotificationToUser.objects.get(
            notification_id=notification_id,
            user_id=user_id
        )
        notification_user.is_read = True
        notification_user.save()
        
        # Return updated notification data
        notification = Notifications.objects.get(notification_id=notification_id)
        notification_data = NotificationSerializer(notification).data
        notification_data['is_read'] = True
        
        return Response(notification_data)
    except NotificationToUser.DoesNotExist:
        return Response({'message': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
def mark_all_notifications_read(request):
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        NotificationToUser.objects.filter(user_id=user_id).update(is_read=True)
        
        # Return updated notifications data
        notifications = Notifications.objects.filter(
            notificationtouser__user_id=user_id
        ).order_by('-sent_date')
        
        notifications_data = []
        for notification in notifications:
            notification_data = NotificationSerializer(notification).data
            notification_data['is_read'] = True
            notifications_data.append(notification_data)
        
        return Response(notifications_data)
    except Exception as e:
        return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
def mark_all_notifications_read(request):
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        NotificationToUser.objects.filter(user_id=user_id).update(is_read=True)
        return Response({'message': 'All notifications marked as read'})
    except Exception as e:
        return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_faq(request):
    faqs = FAQ.objects.all()
    serializer = FAQSerializer(faqs, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def upload_contribution(request):
    # Use TemporaryFileUploadHandler for large files
    request.upload_handlers = [TemporaryFileUploadHandler()]
    
    user_id = request.data.get('researcher_id')
    if not user_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be Researcher or higher)
    if not check_permission(user_id, 'Researcher'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        researcher = Users.objects.get(user_id=user_id)
        model_id = request.data.get('model')
        
        # Get the uploaded file
        if 'file' not in request.FILES:
            return Response({'message': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        
        # Validate file extension
        if not file.name.endswith('.h5'):
            return Response({'message': 'Invalid file format. Must be .h5'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Upload weights to Google Drive
        gdrive = GoogleDriveHelper(
            researcher.gdrive.get('client_id'),
            researcher.gdrive.get('client_secret'),
            researcher.gdrive.get('refresh_token')
        )
        gdrive.authenticate()
        
        # Create a temporary file path
        temp_dir = '/tmp'
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, file.name)
        
        # Save the uploaded file temporarily
        with open(temp_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)
        
        try:
            # Upload file to Google Drive
            filename = f"contribution_{user_id}_{model_id}_{int(time.time())}.h5"
            with open(temp_path, 'rb') as f:
                weights_url = gdrive.upload_file(
                    file_content=f.read(),
                    filename=filename,
                    folder_url=researcher.gdrive.get('contributions_url')
                )
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
        # Create contribution with Google Drive URL
        contribution = Contributions.objects.create(
            researcher_id=user_id,
            model_id=model_id,
            weights=weights_url,
            status='pending'
        )
        
        serializer = ContributionDetailSerializer(contribution)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response(
            {'message': f'Failed to upload contribution: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_contributions(request):
    user_id = request.query_params.get('researcher_id')
    if not user_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be Researcher or higher)
    if not check_permission(user_id, 'Researcher'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    contributions = Contributions.objects.filter(researcher_id=user_id).order_by('-upload_date')
    serializer = ContributionListSerializer(contributions, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_contribution_weights(request, contribution_id):
    """Get contribution weights separately"""
    user_id = request.query_params.get('user_id')
    if not user_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be at least Admin)
    if not check_permission(user_id, 'Admin'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        contribution = Contributions.objects.get(contribution_id=contribution_id)
        return Response({'weights': contribution.weights})
    except Contributions.DoesNotExist:
        return Response({'message': 'Contribution not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
def delete_contribution(request, contribution_id):
    """Delete a specific contribution"""
    researcher_id = request.query_params.get('researcher_id')
    if not researcher_id:
        return Response({'message': 'Researcher ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be Researcher or Admin)
    if not check_permission(researcher_id, 'Researcher'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # First check if the contribution exists
        contribution = Contributions.objects.get(contribution_id=contribution_id)
        
        # Only allow deletion if:
        # 1. The user is the owner and the status is 'pending'
        # 2. The user is an admin
        user = Users.objects.get(user_id=researcher_id)
        if not (
            (contribution.researcher_id == int(researcher_id) and contribution.status == 'pending') or 
            user.role_id == 4  # Admin role
        ):
            return Response(
                {'message': 'Cannot delete this contribution'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Use a transaction to ensure data consistency
        from django.db import transaction
        with transaction.atomic():
            # First delete any related records in the contributiontomodel table
            ContributionToModel.objects.filter(contribution_id=contribution_id).delete()
            
            # Then delete the contribution
            contribution.delete()
            
        return Response({'message': 'Contribution deleted successfully'}, status=status.HTTP_200_OK)
        
    except Contributions.DoesNotExist:
        return Response({'message': 'Contribution not found'}, status=status.HTTP_404_NOT_FOUND)
    except Users.DoesNotExist:
        return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error deleting contribution: {str(e)}")
        return Response(
            {'message': f'Failed to delete contribution: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def assign_role(request):
    admin_id = request.data.get('admin_id')
    if not admin_id:
        return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be Admin)
    if not check_permission(admin_id, 'Admin'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    user_id = request.data.get('user_id')
    role_id = request.data.get('role_id')
    
    try:
        user = Users.objects.get(user_id=user_id)
        role = Roles.objects.get(role_id=role_id)
        
        user.role = role
        user.save()
        
        serializer = UserSerializer(user)
        return Response(serializer.data)
    except Users.DoesNotExist:
        return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Roles.DoesNotExist:
        return Response({'message': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def review_contributions(request):
    admin_id = request.query_params.get('admin_id')
    if not admin_id:
        return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be Admin)
    if not check_permission(admin_id, 'Admin'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    status_filter = request.query_params.get('status', 'pending')
    
    try:
        # If status is 'all', don't filter by status
        if status_filter == 'all':
            contributions = Contributions.objects.all().order_by('-upload_date')
        else:
            contributions = Contributions.objects.filter(status=status_filter).order_by('-upload_date')
            
        serializer = ContributionListSerializer(contributions, many=True)  # Use the new serializer
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'message': f'Failed to fetch contributions: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PUT'])
def update_contribution_status(request, contribution_id):
    """Update contribution status and award points if accepted"""
    admin_id = request.data.get('admin_id')
    if not admin_id:
        return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be Admin)
    if not check_permission(admin_id, 'Admin'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        contribution = Contributions.objects.get(contribution_id=contribution_id)
        new_status = request.data.get('status')
        points = request.data.get('points_earned', 0)
        
        # Validate status
        valid_statuses = ['pending', 'approved', 'rejected', 'aggregated']
        if new_status not in valid_statuses:
            return Response(
                {'message': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update contribution status
        contribution.status = new_status
        
        # If changing to approved or aggregated, update points
        if new_status in ['approved', 'aggregated']:
            contribution.points_earned = points
            
            # Update researcher's total points
            researcher = contribution.researcher
            researcher.total_points += points
            researcher.save()
            
            # Create notification for the researcher
            notification = Notifications.objects.create(
                message=f"Your contribution has been {new_status}. You earned {points} points!"
            )
            NotificationToUser.objects.create(
                notification=notification,
                user=researcher,
                is_read=False
            )
        
        contribution.save()
        serializer = ContributionListSerializer(contribution)
        return Response(serializer.data)
    except Contributions.DoesNotExist:
        return Response({'message': 'Contribution not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response(
            {'message': f'Failed to update contribution: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def create_experimental_model(request):
    admin_id = request.data.get('admin_id')
    if not admin_id:
        return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not check_permission(admin_id, 'Admin'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        admin = Users.objects.get(user_id=admin_id)
        contribution_ids = request.data.get('contribution_ids', [])
        model_name = request.data.get('model_name')
        model_description = request.data.get('model_description')
        points_per_contribution = request.data.get('points_per_contribution', 10)
        target_model_id = request.data.get('target_model_id')
        
        # Get target model and aggregate weights
        target_model = Models.objects.get(model_id=target_model_id)
        contributions = Contributions.objects.filter(contribution_id__in=contribution_ids)
        
        # Aggregate weights and upload to Google Drive
        aggregated_weights = {
            'weights': request.data.get('weights'),
            'architecture': target_model.weights.get('architecture')
        }
        
        gdrive = GoogleDriveHelper(
            admin.gdrive.get('client_id'),
            admin.gdrive.get('client_secret'),
            admin.gdrive.get('refresh_token')
        )
        gdrive.authenticate()
        
        # Upload aggregated weights to Google Drive
        filename = f"model_{model_name}_v{target_model.version + 1}.json"
        weights_url = gdrive.upload_file(
            aggregated_weights,
            filename,
            admin.gdrive.get('models_url')
        )
        
        # Create experimental model with Google Drive URL
        exp_model = Models.objects.create(
            model_name=model_name,
            model_description=model_description,
            version=target_model.version + 1,
            status='experimental',
            weights=weights_url,
            metrics=target_model.metrics
        )
        
        # Update contributions and create links
        for contribution in contributions:
            ContributionToModel.objects.create(
                model=exp_model,
                contribution=contribution
            )
            
            if contribution.status != 'aggregated':
                contribution.status = 'aggregated'
                contribution.points_earned = points_per_contribution
                contribution.save()
                
                researcher = contribution.researcher
                researcher.total_points += points_per_contribution
                researcher.save()
                
                notification = Notifications.objects.create(
                    message=f"Your contribution was aggregated into experimental model v{exp_model.version}. You earned {points_per_contribution} points!"
                )
                NotificationToUser.objects.create(
                    notification=notification,
                    user=researcher,
                    is_read=False
                )
        
        serializer = ModelDetailSerializer(exp_model)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response(
            {'message': f'Failed to create experimental model: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def publish_model(request):
    """
    Publish an experimental model by updating its status to 'active'
    """
    admin_id = request.data.get('admin_id')
    model_id = request.data.get('model_id')
    
    if not admin_id:
        return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not model_id:
        return Response({'message': 'Model ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be Admin)
    if not check_permission(admin_id, 'Admin'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get the model
        model = Models.objects.get(model_id=model_id)
        
        # Check if model is experimental
        if model.status != 'experimental':
            return Response(
                {'message': 'Only experimental models can be published'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update model status to active
        model.status = 'active'
        model.published_date = timezone.now()
        model.save()
        
        # Create notification for all members and researchers
        members_and_researchers = Users.objects.filter(role_id__in=[2, 3])  # Member and Researcher roles
        
        notification = Notifications.objects.create(
            message=f"New model version {model.version} has been published!"
        )
        
        # Create notification-user relationships
        notification_users = [
            NotificationToUser(
                notification=notification,
                user=user,
                is_read=False
            )
            for user in members_and_researchers
        ]
        NotificationToUser.objects.bulk_create(notification_users)
        
        serializer = ModelDetailSerializer(model)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Models.DoesNotExist:
        return Response({'message': 'Model not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response(
            {'message': f'Failed to publish model: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
@api_view(['GET', 'POST'])
def manage_models(request):
    """Handle both GET and POST requests for models"""
    if request.method == 'GET':
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not check_permission(user_id, 'Member'):
            return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            models = Models.objects.all().order_by('-version')
            serializer = ModelListSerializer(models, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        admin_id = request.data.get('admin_id')
        if not admin_id:
            return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not check_permission(admin_id, 'Admin'):
            return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Validate required fields
            required_fields = ['model_name', 'model_description', 'weights']
            for field in required_fields:
                if not request.data.get(field):
                    return Response(
                        {'message': f'Missing required field: {field}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Validate weights format
            weights = request.data.get('weights')
            if not isinstance(weights, dict) or 'weights_url' not in weights:
                return Response(
                    {'message': 'Invalid weights format. Must include weights_url'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get latest version number
            latest_model = Models.objects.order_by('-version').first()
            new_version = 1 if not latest_model else latest_model.version + 1
            
            # Create new model with provided data
            model_data = {
                'model_name': request.data.get('model_name'),
                'model_description': request.data.get('model_description'),
                'version': new_version,
                'status': 'experimental',
                'weights': weights,  # This now contains the Google Drive URL
                'metrics': request.data.get('metrics', {
                    'accuracy': 0.0,
                    'precision': 0.0,
                    'recall': 0.0,
                    'f1_score': 0.0
                })
            }
            
            serializer = ModelDetailSerializer(data=model_data)
            if serializer.is_valid():
                model = serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(
                {'message': 'Invalid model data', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        except Exception as e:
            print(f"Error creating model: {str(e)}")
            return Response(
                {'message': f'Failed to create model: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['PUT'])
def moderate_comment(request, comment_id):
    admin_id = request.data.get('admin_id')
    if not admin_id:
        return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be Admin)
    if not check_permission(admin_id, 'Admin'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        comment = Comments.objects.get(comment_id=comment_id)
        comment.is_approved = request.data.get('is_approved', False)
        comment.save()
        
        serializer = CommentSerializer(comment)
        return Response(serializer.data)
    except Comments.DoesNotExist:
        return Response({'message': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def create_faq(request):
    admin_id = request.data.get('created_by')
    if not admin_id:
        return Response({'message': 'Admin ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be Admin)
    if not check_permission(admin_id, 'Admin'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = FAQSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
def delete_user(request, user_id):
    admin_id = request.query_params.get('admin_id')
    if not admin_id:
        return Response({'message': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check permissions (must be Admin)
    if not check_permission(admin_id, 'Admin'):
        return Response({'message': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Don't allow admins to delete themselves
        if int(admin_id) == int(user_id):
            return Response({'message': 'Cannot delete your own account'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = Users.objects.get(user_id=user_id)
        user.delete()
        return Response({'message': 'User deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
    except Users.DoesNotExist:
        return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)