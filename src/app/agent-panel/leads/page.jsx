"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LeadForm from "@/components/leads/LeadForm";
import LeadsTable from "@/components/leads/LeadsTable";
import { addLead, getAllLeads, updateLeadStatus } from "@/firebase/leadsService";
import { useRouter } from "next/navigation";


export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [showAddLead, setShowAddLead] = useState(false);
  const router = useRouter();
    

  const [form, setForm] = useState({
    name: "",
    travelDate: "",
    days: "",
    Destination: "",
    adults: "",
    hotelPreference: "",
    transportPreference: "",
    budget: "",
    notes: "",
  });

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    const data = await getAllLeads();
    setLeads(data);
  };
  
  const handleSubmit = async (e) => {
  e.preventDefault();

  await addLead({
    ...form,
    status: "New",
    createdAt: new Date().toISOString(),
  });

  setShowAddLead(false);
  setForm({
    name: "",
    travelDate: "",
    days: "",
    destination: "",
    adults: "",
    hotelPreference: "",
    transportPreference: "",
    budget: "",
    notes: "",
  });

  loadLeads();
};

  const handleStatusChange = async (id, status) => {
    await updateLeadStatus(id, status);
    loadLeads();
  };


  const handleCreateQuotation = (lead) => {
  router.push(
    `/agent-panel?leadId=${lead.id}&leadName=${encodeURIComponent(lead.name)}`
  );
};
  return (
    <div className="min-h-screen bg-slate-50/50 w-full">
      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg relative p-6">
            <button
              onClick={() => setShowAddLead(false)}
              className="absolute top-4 right-4 text-xl"
            >
              ✕
            </button>

            <LeadForm
              form={form}
              onChange={(e) =>
                setForm({ ...form, [e.target.name]: e.target.value })
              }
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      )}

      <main className="px-6 py-8">
        <Card className="border-none shadow-md">
          <CardHeader className="border-b bg-white">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Leads</CardTitle>
                <CardDescription>Manage all travel leads</CardDescription>
              </div>
              <Button  className="bg-theme-primary text-white " onClick={() => setShowAddLead(true)}>
                Add Lead
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <LeadsTable
              leads={leads}
              onStatusChange={handleStatusChange}
              onCreateQuotation={handleCreateQuotation}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
