import { useState } from "react";
import {
  CodeBracketIcon,
  DocumentTextIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";

export default function Guide() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", name: "Overview", icon: DocumentTextIcon },
    { id: "download", name: "Using Models", icon: CloudArrowDownIcon },
    { id: "contribute", name: "Contributing", icon: CloudArrowUpIcon },
    { id: "code", name: "Code Examples", icon: CodeBracketIcon },
  ];

  const codeExamples = {
    loadModel: `import json
import numpy as np
from tensorflow.keras.models import model_from_json

# Load the downloaded JSON file
with open('global_model.json', 'r') as f:
    model_data = json.load(f)

# Rebuild the model architecture
architecture = model_data['architecture']
model = model_from_json(architecture)

# Load the weights into the model
weights = [np.array(w) for w in model_data['weights']]
model.set_weights(weights)

# Your model is now ready to use!
print("Model loaded successfully!")`,
    saveModel: `import json
import numpy as np
from tensorflow.keras import models

# Assuming 'model' is your trained Keras model
# Get weights and architecture
weights = [w.tolist() for w in model.get_weights()]  # Convert weights to lists
architecture = model.to_json()  # Get architecture as JSON

# Combine into one object
model_data = {
    "weights": weights,
    "architecture": architecture
}

# Save to a JSON file
with open('my_model.json', 'w') as f:
    json.dump(model_data, f)

print("Model saved as my_model.json!")`,
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">
            Platform Guide
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Learn how to use and contribute to our federated learning platform
            for brain tumor diagnosis
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } flex whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {activeTab === "overview" && (
            <div className="prose max-w-none">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Welcome to Our Platform!
              </h2>
              <p className="text-gray-600 mb-4">
                Our federated learning platform enables collaboration between
                researchers and medical professionals to improve brain tumor
                diagnosis through machine learning. Here's what you can do based
                on your role:
              </p>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mt-6">
                <div className="bg-indigo-50 p-6 rounded-lg">
                  <h3 className="text-indigo-800 font-semibold mb-2">
                    As a Member
                  </h3>
                  <ul className="text-indigo-700 text-sm space-y-2">
                    <li>• Download and use global models</li>
                    <li>• Rate and comment on models</li>
                    <li>• Receive update notifications</li>
                    <li>• Access performance metrics</li>
                  </ul>
                </div>

                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-purple-800 font-semibold mb-2">
                    As a Researcher
                  </h3>
                  <ul className="text-purple-700 text-sm space-y-2">
                    <li>• All Member features</li>
                    <li>• Upload model contributions</li>
                    <li>• Track contribution status</li>
                    <li>• Earn contribution points</li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-blue-800 font-semibold mb-2">
                    As an Admin
                  </h3>
                  <ul className="text-blue-700 text-sm space-y-2">
                    <li>• Manage users and roles</li>
                    <li>• Review contributions</li>
                    <li>• Publish global models</li>
                    <li>• Moderate community content</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === "download" && (
            <div className="prose max-w-none">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Using Global Models
              </h2>

              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-lg mb-6">
                <h3 className="text-indigo-800 font-semibold mb-2">
                  Quick Start Guide
                </h3>
                <ol className="list-decimal list-inside text-gray-700 space-y-3">
                  <li>Navigate to the "Global Models" section</li>
                  <li>Choose a model version and click "Download"</li>
                  <li>Use the provided Python code to load the model</li>
                  <li>Start making predictions on your data</li>
                </ol>
              </div>

              <div className="bg-yellow-50 p-6 rounded-lg mb-6">
                <h3 className="text-yellow-800 font-semibold mb-2">
                  Important Notes
                </h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Ensure you have TensorFlow installed</li>
                  <li>Check model version compatibility</li>
                  <li>Review performance metrics before use</li>
                  <li>Share your experience through ratings and comments</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "contribute" && (
            <div className="prose max-w-none">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Contributing to the Platform
              </h2>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-6">
                <h3 className="text-green-800 font-semibold mb-2">
                  Contribution Process
                </h3>
                <ol className="list-decimal list-inside text-gray-700 space-y-3">
                  <li>Train your model on approved datasets</li>
                  <li>Export weights in the required JSON format</li>
                  <li>Upload through the contribution interface</li>
                  <li>Wait for admin review and approval</li>
                  <li>Earn points for accepted contributions</li>
                </ol>
              </div>

              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="text-orange-800 font-semibold mb-2">
                  Best Practices
                </h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Ensure model architecture compatibility</li>
                  <li>Document your training process</li>
                  <li>Test thoroughly before submission</li>
                  <li>Follow the contribution guidelines</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "code" && (
            <div className="prose max-w-none">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Code Examples
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">
                    Loading a Model
                  </h3>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <pre className="text-sm text-gray-100 overflow-x-auto">
                      <code>{codeExamples.loadModel}</code>
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">
                    Saving Your Model for Contribution
                  </h3>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <pre className="text-sm text-gray-100 overflow-x-auto">
                      <code>{codeExamples.saveModel}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
