"use client";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { fetchAgentQuotes, deleteQuote } from "@/firebase/quotes";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table"; // Shadcn table
import { Trash2, Edit, FileText, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { generatePDF } from "@/utils/pdfGenerator"; // You will wrap the jsPDF logic here

const MyQuotesPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState("");

  const loadQuotes = async () => {
    if(user) {
        const data = await fetchAgentQuotes(user.uid);
        setQuotes(data);
    }
  };

  useEffect(() => { loadQuotes(); }, [user]);

  const handleDelete = async (id) => {
    if(confirm("Delete this quote?")) {
        await deleteQuote(user.uid, id);
        toast.success("Deleted");
        loadQuotes();
    }
  };

  // Filter
  const filtered = quotes.filter(q => 
    q.customerName.toLowerCase().includes(search.toLowerCase()) || 
    q.packageName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-theme-dark">My Quotations</h1>
        <input 
          placeholder="Search quotes..." 
          className="border p-2 rounded w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {filtered.map(quote => (
          <Card key={quote.id} className="p-4 flex flex-col md:flex-row justify-between items-center hover:shadow-md transition">
             <div>
                <h3 className="font-bold text-lg text-theme-primary">{quote.packageName}</h3>
                <p className="text-gray-600">{quote.customerName} • {new Date(quote.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                <div className="flex gap-2 mt-2 text-xs text-gray-500">
                    <span className="bg-blue-100 px-2 py-1 rounded">₹{quote.grandTotal}</span>
                    <span className="bg-green-100 px-2 py-1 rounded">{quote.status}</span>
                </div>
             </div>
             
             <div className="flex gap-2 mt-4 md:mt-0">
                <button onClick={() => generatePDF(quote)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="PDF">
                    <FileText size={20} />
                </button>
                <button className="p-2 text-green-600 hover:bg-green-50 rounded" title="Edit">
                    <Edit size={20} />
                </button>
                <button onClick={() => handleDelete(quote.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete">
                    <Trash2 size={20} />
                </button>
             </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MyQuotesPage;