# api/models.py
from django.db import models

class Roles(models.Model):
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=50, unique=True)
    
    class Meta:
        managed = False
        db_table = 'roles'

class Users(models.Model):
    user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    password_hash = models.CharField(max_length=255)
    email = models.CharField(max_length=100, unique=True)
    gdrive = models.JSONField(default=dict)  # Added gdrive field
    role = models.ForeignKey(Roles, models.DO_NOTHING, db_column='role_id', default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    total_points = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    notifications = models.ManyToManyField('Notifications', through='NotificationToUser', related_name='notified_users')
    
    class Meta:
        managed = False
        db_table = 'users'

class Models(models.Model):
    model_id = models.AutoField(primary_key=True)
    model_name = models.CharField(max_length=50)
    model_description = models.TextField()
    version = models.IntegerField()
    published_date = models.DateTimeField(auto_now_add=True)
    created_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='experimental')
    weights = models.JSONField()  # Now stores Google Drive URL
    metrics = models.JSONField()
    
    class Meta:
        managed = False
        db_table = 'models'

class Contributions(models.Model):
    contribution_id = models.AutoField(primary_key=True)
    researcher = models.ForeignKey(Users, models.DO_NOTHING, db_column='researcher_id')
    model = models.ForeignKey(Models, models.DO_NOTHING, db_column='model_id', null=True)
    upload_date = models.DateTimeField(auto_now_add=True)
    weights = models.JSONField()  # Now stores Google Drive URL
    status = models.CharField(max_length=20, default='pending')
    points_earned = models.IntegerField(default=0)
    
    class Meta:
        managed = False
        db_table = 'contributions'

class ContributionToModel(models.Model):
    id = models.AutoField(primary_key=True)  # Add this line
    model = models.ForeignKey(Models, models.DO_NOTHING, db_column='model_id')
    contribution = models.ForeignKey(Contributions, models.DO_NOTHING, db_column='contribution_id')
    
    class Meta:
        managed = False
        db_table = 'contributiontomodel'
        unique_together = (('model', 'contribution'),)

class Ratings(models.Model):
    rating_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(Users, models.DO_NOTHING, db_column='user_id')
    model = models.ForeignKey(Models, models.DO_NOTHING, db_column='model_id')
    rating = models.IntegerField()
    rated_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        managed = False
        db_table = 'ratings'

class Comments(models.Model):
    comment_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(Users, models.DO_NOTHING, db_column='user_id')
    model = models.ForeignKey(Models, models.DO_NOTHING, db_column='model_id')
    comment_text = models.TextField()
    comment_date = models.DateTimeField(auto_now_add=True)
    is_approved = models.BooleanField(default=False)
    
    class Meta:
        managed = False
        db_table = 'comments'

class Notifications(models.Model):
    notification_id = models.AutoField(primary_key=True)
    message = models.TextField()
    sent_date = models.DateTimeField(auto_now_add=True)
    users = models.ManyToManyField(Users, through='NotificationToUser', related_name='received_notifications')
    
    class Meta:
        managed = False
        db_table = 'notifications'

class NotificationToUser(models.Model):
    notification = models.ForeignKey(Notifications, models.DO_NOTHING, db_column='notification_id', primary_key=True)
    user = models.ForeignKey(Users, models.DO_NOTHING, db_column='user_id')
    is_read = models.BooleanField(default=False)
    
    class Meta:
        managed = False
        db_table = 'notificationtouser'
        unique_together = (('notification', 'user'),)

class FAQ(models.Model):
    faq_id = models.AutoField(primary_key=True)
    question = models.TextField()
    answer = models.TextField()
    created_by = models.ForeignKey(Users, models.DO_NOTHING, db_column='created_by')
    created_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        managed = False
        db_table = 'faq'