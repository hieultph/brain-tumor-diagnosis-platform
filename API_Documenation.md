# Federated Learning Platform API Documentation

## Base URL

```
http://localhost:8000/api
```

## Authentication

All endpoints require authentication unless specified otherwise. Authentication is handled via user credentials.

## Endpoints

### Authentication

#### Login

- **URL**: `/login/`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:

```json
{
  "username": "string",
  "password": "string"
}
```

- **Success Response (200)**:

```json
{
  "user": {
    "user_id": "integer",
    "username": "string",
    "email": "string",
    "role": "integer",
    "created_at": "timestamp",
    "total_points": "integer",
    "is_active": "boolean"
  },
  "message": "Login successful"
}
```

- **Error Response (401)**:

```json
{
  "message": "Invalid credentials"
}
```

- **Error Response (401)**:

```json
{
  "message": "Invalid credentials"
}
```

### Member Features

#### Get Models

- **URL**: `/models/`
- **Method**: `GET`
- **Auth Required**: Yes (Member+)
- **Query Parameters**:
  - `user_id`: integer
  - `status`: string (optional, defaults to "active")
- **Success Response (200)**:

```json
[
  {
    "model_id": "integer",
    "model_name": "string",
    "model_description": "string",
    "version": "integer",
    "published_date": "timestamp",
    "created_date": "timestamp",
    "status": "string", // "active", "experimental", or "archived"
    "weights": "json",
    "metrics": {
      "accuracy": "float",
      "precision": "float",
      "recall": "float"
    }
  }
]
```

#### Get Specific Model

- **URL**: `/models/{model_id}/`
- **Method**: `GET`
- **Auth Required**: Yes (Member+)
- **Query Parameters**:
  - `user_id`: integer
- **Success Response (200)**:

```json
{
  "model_id": "integer",
  "model_name": "string",
  "model_description": "string",
  "version": "integer",
  "published_date": "timestamp",
  "created_date": "timestamp",
  "status": "string",
  "weights": "json",
  "metrics": {
    "accuracy": "float",
    "precision": "float",
    "recall": "float"
  }
}
```

#### Rate Model

- **URL**: `/rate-model/`
- **Method**: `POST`
- **Auth Required**: Yes (Member+)
- **Request Body**:

```json
{
  "user_id": "integer",
  "user": "integer",
  "model": "integer",
  "rating": "integer (1-5)"
}
```

- **Success Response (201)**:

```json
{
  "rating_id": "integer",
  "user": "integer",
  "model": "integer",
  "rating": "integer",
  "rated_date": "timestamp"
}
```

#### Comment on Model

- **URL**: `/comment-model/`
- **Method**: `POST`
- **Auth Required**: Yes (Member+)
- **Request Body**:

```json
{
  "user_id": "integer",
  "user": "integer",
  "model": "integer",
  "comment_text": "string"
}
```

- **Success Response (201)**:

```json
{
  "comment_id": "integer",
  "user": "integer",
  "model": "integer",
  "comment_text": "string",
  "comment_date": "timestamp",
  "is_approved": "boolean"
}
```

#### Get Notifications

- **URL**: `/notifications/`
- **Method**: `GET`
- **Auth Required**: Yes (Member+)
- **Query Parameters**:
  - `user_id`: integer
- **Success Response (200)**:

```json
[
  {
    "notification_id": "integer",
    "message": "string",
    "sent_date": "timestamp",
    "is_read": "boolean"
  }
]
```

#### Get FAQ

- **URL**: `/faq/`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response (200)**:

```json
[
  {
    "faq_id": "integer",
    "question": "string",
    "answer": "string",
    "created_by": "integer",
    "created_date": "timestamp"
  }
]
```

### Researcher Features

#### Upload Contribution

- **URL**: `/contributions/upload/`
- **Method**: `POST`
- **Auth Required**: Yes (Researcher+)
- **Request Body**:

```json
{
  "researcher_id": "integer",
  "researcher": "integer",
  "model": "integer",
  "weights": "json",
  "status": "string"
}
```

- **Success Response (201)**:

```json
{
  "contribution_id": "integer",
  "researcher": "integer",
  "researcher_name": "string",
  "model": "integer",
  "model_details": {
    "model_id": "integer",
    "model_name": "string",
    "version": "integer",
    "status": "string"
  },
  "upload_date": "timestamp",
  "weights": "json",
  "status": "string",
  "points_earned": "integer"
}
```

#### Get Contributions

- **URL**: `/contributions/`
- **Method**: `GET`
- **Auth Required**: Yes (Researcher+)
- **Query Parameters**:
  - `researcher_id`: integer
- **Success Response (200)**:

```json
[
  {
    "contribution_id": "integer",
    "researcher": "integer",
    "researcher_name": "string",
    "model": "integer",
    "model_details": {
      "model_id": "integer",
      "model_name": "string",
      "version": "integer",
      "status": "string"
    },
    "upload_date": "timestamp",
    "weights": "json",
    "status": "string",
    "points_earned": "integer"
  }
]
```

#### Delete Contribution

- **URL**: `/contributions/{contribution_id}/delete/`
- **Method**: `DELETE`
- **Auth Required**: Yes (Researcher+)
- **Query Parameters**:
  - `researcher_id`: integer
- **Success Response (204)**:

```json
{
  "message": "Contribution deleted successfully"
}
```

### Admin Features

#### Assign Role

- **URL**: `/users/assign-role/`
- **Method**: `POST`
- **Auth Required**: Yes (Admin)
- **Request Body**:

```json
{
  "admin_id": "integer",
  "user_id": "integer",
  "role_id": "integer"
}
```

- **Success Response (200)**:

```json
{
  "user_id": "integer",
  "username": "string",
  "email": "string",
  "role": "integer",
  "created_at": "timestamp",
  "total_points": "integer",
  "is_active": "boolean"
}
```

#### Review Contributions

- **URL**: `/contributions/review/`
- **Method**: `GET`
- **Auth Required**: Yes (Admin)
- **Query Parameters**:
  - `admin_id`: integer
  - `status`: string (optional, defaults to "pending")
- **Success Response (200)**:

```json
[
  {
    "contribution_id": "integer",
    "researcher": "integer",
    "researcher_name": "string",
    "model": "integer",
    "model_details": {
      "model_id": "integer",
      "model_name": "string",
      "version": "integer",
      "status": "string"
    },
    "upload_date": "timestamp",
    "weights": "json",
    "status": "string",
    "points_earned": "integer"
  }
]
```

#### Update Contribution Status

- **URL**: `/contributions/{contribution_id}/update-status/`
- **Method**: `PUT`
- **Auth Required**: Yes (Admin)
- **Request Body**:

```json
{
  "admin_id": "integer",
  "status": "string",
  "points_earned": "integer"
}
```

- **Success Response (200)**:

```json
{
  "contribution_id": "integer",
  "researcher": "integer",
  "model": "integer",
  "upload_date": "timestamp",
  "weights": "json",
  "status": "string",
  "points_earned": "integer"
}
```

#### Create Experimental Model

- **URL**: `/models/experimental/`
- **Method**: `POST`
- **Auth Required**: Yes (Admin)
- **Request Body**:

```json
{
  "admin_id": "integer",
  "contribution_ids": "array[integer]",
  "weights": "json",
  "metrics": "json",
  "points_per_contribution": "integer"
}
```

- **Success Response (201)**:

```json
{
  "model_id": "integer",
  "version": "integer",
  "created_date": "timestamp",
  "status": "experimental",
  "weights": "json",
  "metrics": "json"
}
```

#### Publish Model

- **URL**: `/models/publish/`
- **Method**: `POST`
- **Auth Required**: Yes (Admin)
- **Request Body**:

```json
{
  "admin_id": "integer",
  "model_id": "integer", // ID of experimental model to publish
  "metrics": {
    "accuracy": "float",
    "precision": "float",
    "recall": "float",
    "f1_score": "float"
  }
}
```

- **Success Response (201)**:

```json
{
  "model_id": "integer",
  "version": "integer",
  "published_date": "timestamp",
  "created_date": "timestamp",
  "status": "active",
  "weights": "json",
  "metrics": "json"
}
```

- **Success Response (201)**:

```json
{
  "model_id": "integer",
  "version": "integer",
  "published_date": "timestamp",
  "weights": "json",
  "metrics": "json"
}
```

#### Moderate Comment

- **URL**: `/comments/{comment_id}/moderate/`
- **Method**: `PUT`
- **Auth Required**: Yes (Admin)
- **Request Body**:

```json
{
  "admin_id": "integer",
  "is_approved": "boolean"
}
```

- **Success Response (200)**:

```json
{
  "comment_id": "integer",
  "user": "integer",
  "model": "integer",
  "comment_text": "string",
  "comment_date": "timestamp",
  "is_approved": "boolean"
}
```

#### Create FAQ

- **URL**: `/faq/create/`
- **Method**: `POST`
- **Auth Required**: Yes (Admin)
- **Request Body**:

```json
{
  "created_by": "integer",
  "question": "string",
  "answer": "string"
}
```

- **Success Response (201)**:

```json
{
  "faq_id": "integer",
  "question": "string",
  "answer": "string",
  "created_by": "integer",
  "created_date": "timestamp"
}
```

#### Delete User

- **URL**: `/users/{user_id}/delete/`
- **Method**: `DELETE`
- **Auth Required**: Yes (Admin)
- **Query Parameters**:
  - `admin_id`: integer
- **Success Response (204)**:

```json
{
  "message": "User deleted successfully"
}
```

## Status Codes

- 200: Success
- 201: Created
- 204: No Content
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Role Hierarchy

1. Visitor (1)
2. Member (2)
3. Researcher (3)
4. Admin (4)

## Notes

- All timestamps are in ISO 8601 format
- All IDs are integers
- Role-based access control is enforced for all endpoints
- Weights and metrics are stored as JSON objects
- The `status` field in Models can have the following values:
  - `experimental`: For models in testing phase
  - `active`: For published production models
  - `archived`: For deprecated models
- When creating an experimental model, it automatically gets the `experimental` status
- When publishing a model, its status changes to `active`
- The `version` field is automatically incremented for each new model
- The `created_date` tracks when the model was first created (as experimental)
- The `published_date` tracks when the model was published (became active)
