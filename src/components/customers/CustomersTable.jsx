import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";




export default function CustomersTable({ customers, setCustomers, onEdit }) {
    const router = useRouter();
  return (
<div className="bg-white p-4 md:p-4 rounded-2xl shadow-md border w-full overflow-x-auto">

  <h3 className="text-lg font-semibold mb-4">All Customer Leads</h3>

      {customers.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          No leads added yet.
        </div>
      ) : (
<table className="w-full text-sm text-left border border-slate-300 border-collapse min-w-[900px]">
             <thead className="bg-slate-100 text-slate-700">
            <tr>
                <th className="p-3  border border-slate-300">Name</th>
                <th className="p-3  border border-slate-300">Mobile</th>
                <th className="p-3  border border-slate-300">Email</th>
                <th className="p-3  border border-slate-300">City</th>
                        <th className="p-3  border border-slate-300">State</th>
                <th className="p-3 border border-slate-300   text-center">Actions</th>
            </tr>
            </thead>
          <tbody>
                {customers.map((c, i) => (
                    <tr
                    key={i}
                    className="border-b hover:bg-slate-50 transition"
                    >
                    <td className="p-3 text-slate-700 border border-slate-300">
                        {c.name}
                    </td>
                    <td className="p-3 text-slate-700 border border-slate-300">
                        {c.mobile}
                    </td>
                    <td className="p-3 text-slate-700 border border-slate-300">
                        {c.email}
                    </td>
                   
                        <td className="p-3 text-slate-600 border border-slate-300 ">
                            {c.city}
                        </td>
                        <td className="p-3 text-slate-600 border border-slate-300">
                            {c.state}
                        </td>
     <td className="p-3 border border-slate-300">
     <div className="flex flex-col gap-2">
    <Button size="sm" className="bg-theme-primary text-white"  variant="outline" onClick={() => {
                  router.push(`/agent-panel?customerId=${c.id}`);
              }}> Create Quotation </Button>
      <div className="flex flex-col gap-2">
      <Button    size="sm" variant="outline"  className=" bg-theme-primary text-white w-full"> View  </Button>
      <Button  size="sm"  variant="secondary" className=" bg-theme-primary text-white w-full"  onClick={() => onEdit(c)} >Edit </Button>
    </div>
   </div>
  </td>
  </tr>
  ))}
  </tbody>
  </table>
  )}
    </div>
  );
}
