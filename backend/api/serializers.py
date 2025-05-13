# api/serializers.py
from rest_framework import serializers
from .models import *

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roles
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = Users
        fields = ['user_id', 'username', 'email', 'role', 'created_at', 'total_points', 'is_active']
        read_only_fields = ['user_id', 'created_at']

class ModelListSerializer(serializers.ModelSerializer):
    """Serializer for listing models without weights"""
    class Meta:
        model = Models
        exclude = ('weights',)
        read_only_fields = ['model_id', 'published_date', 'created_date']

class ModelDetailSerializer(serializers.ModelSerializer):
    """Serializer for model creation and full detail"""
    class Meta:
        model = Models
        fields = '__all__'
        read_only_fields = ['model_id', 'published_date', 'created_date']

class ContributionListSerializer(serializers.ModelSerializer):
    """Serializer for listing contributions without weights"""
    researcher_name = serializers.CharField(source='researcher.username', read_only=True)
    model_details = ModelListSerializer(source='model', read_only=True)

    class Meta:
        model = Contributions
        exclude = ('weights',)
        read_only_fields = ['contribution_id', 'upload_date']

class ContributionDetailSerializer(serializers.ModelSerializer):
    """Serializer for contribution creation and full detail"""
    researcher_name = serializers.CharField(source='researcher.username', read_only=True)
    model_details = ModelListSerializer(source='model', read_only=True)

    class Meta:
        model = Contributions
        fields = '__all__'
        read_only_fields = ['contribution_id', 'upload_date']

class ContributionToModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContributionToModel
        fields = '__all__'

class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ratings
        fields = '__all__'
        read_only_fields = ['rating_id', 'rated_date']

class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comments
        fields = '__all__'
        read_only_fields = ['comment_id', 'comment_date']

class NotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.BooleanField(source='notificationtouser.is_read', read_only=True)

    class Meta:
        model = Notifications
        fields = ['notification_id', 'message', 'sent_date', 'is_read']
        read_only_fields = ['notification_id', 'sent_date']

class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = '__all__'
        read_only_fields = ['faq_id', 'created_date']

# Custom serializers for login and role checking
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=50)
    password = serializers.CharField(max_length=255, write_only=True)