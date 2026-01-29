"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CustomerForm from "@/components/customers/CustomerForm";
import CustomersTable from "@/components/customers/CustomersTable";
import { addCustomer, getAllCustomers, udpateCustomer } from "@/firebase/customersService";
import { useEffect } from "react";

export default function CustomersPage() {
const [customers, setCustomers] = useState([]);
const [showTable, setShowTable] = useState(true);
const [search, setSearch] = useState("");
const [showAddCustomer, setShowAddCustomer] = useState(false);
const [ editMode, setEditMode ]= useState(false);
const [ selectedCustomer, setSelectedCustomer] = useState(null);

  const [form, setForm] = useState({
  name: "",
  mobile: "",
  email: "",
  city:"",
  state:""
});

const handleEditCustomer =(customer)=>{
  setEditMode(true);
  setSelectedCustomer(customer);
  setForm(customer);
  setShowAddCustomer(true);
}
 const filteredCustomers = customers.filter((c) =>
    `${c.name} ${c.mobile} ${c.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
    const requiredFields = [
    "name",
    "mobile",
    "email",
   "city",
   "state",
  ];

  for (let field of requiredFields) {
    if (!form[field] || form[field].toString().trim() === "") {
      alert("Please fill the details");
      return;
    }
  }
  if (!/^\d{10}$/.test(form.mobile)) {
    alert("Mobile number must be exactly 10 digits");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    alert("Please enter a valid email address");
    return;
  }

   try {
    if (editMode) {
      await udpateCustomer(selectedCustomer.id, form);
      alert("Customer updated successfully");
    } else {
      await addCustomer({
        ...form,
        status: "New",
        date: new Date().toLocaleDateString(),
      });
      alert("Customer added successfully");
    }

    const updatedCustomers = await getAllCustomers();
    setCustomers(updatedCustomers);

    setShowAddCustomer(false);
    setEditMode(false);
    setSelectedCustomer(null);

  } catch (error) {
    console.error(error);
    alert("Operation failed");
  }
};

useEffect(() => {
  const loadCustomers = async () => {
    const data = await getAllCustomers();

    setCustomers(data);
  };
  loadCustomers();
}, []);

return (
  <div className="min-h-screen bg-slate-50/50 w-full">
    {showAddCustomer && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg relative p-6">
      <button
        onClick={() => setShowAddCustomer(false)}
        className="absolute top-4 right-4 text-gray-500 hover:text-black text-xl"
      > ✕ </button>

      <CustomerForm
        form={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        editMode={editMode}
      />
    </div>
  </div>
)}
<main className="w-full px-6 py-8">
      <div className="grid grid-cols-1 gap-10 items-start">
        <div className="col-span-full">
          <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="border-b bg-white">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl text-theme-dark">
            Customers
          </CardTitle>
          <CardDescription>
            Manage customer enquiries and leads
          </CardDescription>
        </div>
        <div className="flex gap-3">
          <Button 
            size="lg"
            className={!showTable ? "bg-theme-primary  text-white" : "border"}
            onClick={() => {
              setEditMode(false);
              setSelectedCustomer(null);
              setShowAddCustomer(true);
            }}
          >
            Add Customer
          </Button>

        </div>
      </div>
            </CardHeader>
            <CardContent className="p-3">
  {/* Content Area */}
  <div className="grid grid-cols-1 gap-10 items-start">

        {showTable && (
      <div className="mr-6 flex justify-end">
        <input
          type="text"
          placeholder="Search by name, mobile, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded-md w-64"
        />
      </div>
       )}
    {showTable && (
      <CustomersTable
      customers={filteredCustomers}
      setCustomers={setCustomers}
      onEdit={handleEditCustomer}/>
        )}
      </div>
    </CardContent>
                </Card>
            </div>
          </div>
          </main>
      </div>
      );
    }