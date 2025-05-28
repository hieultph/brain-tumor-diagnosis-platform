# Federated Learning Platform for Brain Tumor Diagnosis

## About This Project

This project is a web-based platform designed to enhance brain tumor diagnosis through federated learning. It allows researchers and medical institutions to collaboratively improve AI models while maintaining data privacy. The platform includes role-based access control, secure model management, and real-time predictive analysis.

![Drawing 2025-05-27 21 54 55 excalidraw](https://github.com/user-attachments/assets/6abd781c-0cfc-4e2f-82e8-7f9b5b0eedf5)

### Technologies Used:
- **ReactJS** – Frontend framework for an interactive user experience.
- **Django** – Backend framework handling authentication, data processing, and API interactions.
- **PostgreSQL** – Database management for storing user roles, contributions, and model metadata.

## Key Features
- **Federated Learning Integration** – Enables multiple institutions to contribute to AI model training without sharing sensitive patient data.
- **Role-Based Access** – Supports different roles: Members, Researchers, and Admins, each with specific permissions.
- **Model Management** – Securely upload, download, and track model versions.
- **Real-Time Predictions** – Submit MRI scans for instant AI-driven tumor detection.
- **Performance Dashboards** – Visualize model accuracy, training progress, and user contributions.
- **Contribution Points System** – Incentivizes users by tracking their contributions to model improvements.

## How It Works
1. Researchers and institutions join the platform and are assigned roles.
2. They upload datasets or contribute to training the federated learning model.
3. The AI model is periodically updated and improved based on collective contributions.
4. Users can submit MRI scans to receive real-time predictions.
5. Performance analytics and contribution scores are displayed via dashboards.

## How to Use This Project

1. Clone the repository:
    ```sh
    git clone <repository-url>
    ```
2. Install dependencies:
    ```sh
    pip install -r requirements.txt
    npm install
    ```
3. Run the backend server:
    ```sh
    python manage.py runserver
    ```
4. Run the frontend:
    ```sh
    npm start
    ```

## Found a Bug?

If you find an issue or have suggestions, submit an issue in the [Issues](https://github.com/hieultph/brain-tumor-diagnosis-platform/issues) tab. Contributions are welcome!

## Known Issues (Work in Progress)

Currently, there are no known issues. This section may be updated as development progresses.

## Like This Project?

If you find this project useful, consider giving it a star and following for future updates!
