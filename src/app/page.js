"use client";
import { useState } from "react";

export default function BusinessNameFinder() {
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, category }),
      });

      if (!res.ok) throw new Error("Failed to get business names");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `businesses-${category}-${city}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error getting business names");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4">Business Name Finder</h1>
        <p className="text-gray-600 mb-6">Get up to 100 business names from Google Maps</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2">City</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., New York"
              required
            />
          </div>

          <div>
            <label className="block mb-2">Business Type</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., restaurants, dentists"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:bg-green-400"
            disabled={loading}
          >
            {loading ? "Getting Business Names..." : "Download 100 Business Names"}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-500">
          <p>Example searches:</p>
          <p>• "restaurants in New York"</p>
          <p>• "dentists in Los Angeles"</p>
          <p>• "coffee shops in Chicago"</p>
        </div>
      </div>
    </div>
  );
}