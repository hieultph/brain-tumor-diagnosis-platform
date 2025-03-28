import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import axios from "axios";
import Pagination from "../components/Pagination";

const ITEMS_PER_PAGE = 10;

export default function FAQ() {
  const [faqs, setFaqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/faq/");
      setFaqs(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch FAQs:", error);
      setIsLoading(false);
    }
  };

  const handleCreateFAQ = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/api/faq/create/", {
        created_by: user.user_id,
        question: newQuestion,
        answer: newAnswer,
      });
      setNewQuestion("");
      setNewAnswer("");
      fetchFAQs();
    } catch (error) {
      console.error("Failed to create FAQ:", error);
    }
  };

  // Pagination logic
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedFaqs = faqs.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">
            FAQ
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Frequently asked questions about the Federated Learning Platform
          </p>
        </div>
      </div>

      {user?.role === 4 && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Create New FAQ
            </h3>
            <form onSubmit={handleCreateFAQ} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="question"
                  className="block text-sm font-medium text-gray-700"
                >
                  Question
                </label>
                <textarea
                  id="question"
                  rows={2}
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="answer"
                  className="block text-sm font-medium text-gray-700"
                >
                  Answer
                </label>
                <textarea
                  id="answer"
                  rows={4}
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Create FAQ
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="divide-y divide-gray-200">
            {paginatedFaqs.map((faq) => (
              <div key={faq.faq_id} className="py-6">
                <dt className="text-lg font-medium text-gray-900">
                  {faq.question}
                </dt>
                <dd className="mt-2 text-base text-gray-500">{faq.answer}</dd>
                <div className="mt-2 text-sm text-gray-500">
                  Added on {new Date(faq.created_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
          <Pagination
            totalItems={faqs.length}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
