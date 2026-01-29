"use client";
import { useState } from "react"; 
import { Button } from "@/components/ui/button";




export default function LeadsTable({
  leads,
  onStatusChange,
  onCreateQuotation,

}) 
 { const [editingId, setEditingId] = useState(null); 
  return (
    <div className="overflow-x-auto bg-white rounded-xl border">
      <table className="w-full border-collapse">
        <thead className="bg-slate-50">
          <tr className="  text-center">
            <th className="p-3 border">Lead No</th>
            <th className="p-3 border">Lead Name</th>
            <th className="p-3 border">Date</th>
            <th className="p-3 border">Destination</th>
            <th className="p-3 border">Status</th>
            <th className="p-3 border">Actions</th>
          </tr>
        </thead>

        <tbody>
          {leads.length === 0 && (
            <tr>
              <td
                colSpan="6"
                className="p-6 text-center text-slate-500"
              >
                No leads found
              </td>
            </tr>
          )}

          {leads.map((lead, index) => (
            <tr key={lead.id} className="hover:bg-slate-50 text-center">
              <td className="p-3 border">{index + 1}</td>
              <td className="p-3 border">{lead.name}</td>
              <td className="p-3 border">{lead.travelDate}</td>
              <td className="p-3 border">{lead.Destination || lead.destination }</td>

                      <td className="p-3 border text-center">
                    <select
                      value={lead.status || "New"}
                      onChange={(e) => onStatusChange(lead.id, e.target.value)}
                      className="border rounded-md px-2 py-1 cursor-pointer focus:outline-none "
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Quotation Sent">Quotation Sent</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </td>
                <td className="p-3 border text-center">
                <div className="flex gap-2 center" >
                    
                    <Button   size="sm" variant="outline" className="bg-theme-primary text-white"
                    onClick={() => onCreateQuotation(lead)}
                    >
                    Create Quotation
                    </Button>

                    <Button
                    size="sm"
                    variant="outline" className="bg-theme-primary text-white"
                    onClick={() => alert("View Lead")} >
                    View
                    </Button>
                </div>
                </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
