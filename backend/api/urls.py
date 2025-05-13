# api/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('login/', views.login, name='login'),
    
    # User Management
    path('users/', views.get_users, name='get_users'),
    
    # Member features
    path('models/', views.manage_models, name='manage_models'),
    path('models/<int:model_id>/', views.manage_model_detail, name='manage_model_detail'),
    path('models/<int:model_id>/weights/', views.get_model_weights, name='get_model_weights'),
    path('models/<int:model_id>/delete/', views.delete_model, name='delete_model'),  # Add explicit delete endpoint
    path('rate-model/', views.rate_model, name='rate_model'),
    path('comment-model/', views.comment_on_model, name='comment_on_model'),
    path('comments/<int:model_id>/', views.get_model_comments, name='get_model_comments'),
    path('notifications/', views.get_notifications, name='get_notifications'),
    path('notifications/<int:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),
    path('notifications/mark-all-read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('faq/', views.get_faq, name='get_faq'),
    path('predict/', views.predict_image, name='predict_image'),
    path('users/gdrive-setup/', views.setup_gdrive, name='setup_gdrive'),
    path('users/gdrive-config/', views.get_gdrive_config, name='get_gdrive_config'),
    path('proxy-download/', views.proxy_download, name='proxy_download'),
    
    # Researcher features
    path('contributions/upload/', views.upload_contribution, name='upload_contribution'),
    path('contributions/', views.get_contributions, name='get_contributions'),
    path('contributions/<int:contribution_id>/delete/', views.delete_contribution, name='delete_contribution'),
    path('contributions/<int:contribution_id>/weights/', views.get_contribution_weights, name='get_contribution_weights'),
    path('models/upload-weights/', views.upload_model_weights, name='upload_model_weights'),

    # Admin features
    path('users/assign-role/', views.assign_role, name='assign_role'),
    path('contributions/review/', views.review_contributions, name='review_contributions'),
    path('contributions/<int:contribution_id>/update-status/', views.update_contribution_status, name='update_contribution_status'),
    path('experimental-models/create/', views.create_experimental_model, name='create_experimental_model'),
    path('models/publish/', views.publish_model, name='publish_model'),
    path('comments/<int:comment_id>/moderate/', views.moderate_comment, name='moderate_comment'),
    path('faq/create/', views.create_faq, name='create_faq'),
    path('users/<int:user_id>/delete/', views.delete_user, name='delete_user'),
]