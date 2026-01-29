import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CustomerForm({ form, onChange, onSubmit , editMode }) {
  return (
    <div className="w-full">
            <div className="w-full max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-md border">

            <h3 className="text-xl font-semibold text-theme-dark mb-6 text-center">
          Add New Customer
        </h3>

        <form
          onSubmit={onSubmit} noValidate
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Customer Name</label>
            <Input name="name" value={form.name} placeholder="name" onChange={onChange} required />
          </div>

          {/* Mobile */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Mobile</label>
            <Input name="mobile" value={form.mobile}  placeholder="mobile" onChange={onChange} 
                   pattern="[0-9]{10}" max={10} required />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Email</label>
            <Input type="text" name="email" placeholder="mail" value={form.email} onChange={onChange} />
          </div>
      {/* City */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">City</label>
          <Input
            name="city"
            value={form.city}
            placeholder="Enter city"
            onChange={onChange}
            required
          />
        </div>

        {/* State */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">State</label>
          <Input
            name="state"
            value={form.state}
            placeholder="Enter state"
            onChange={onChange}
            required
          />
        </div>


               
          {/* Submit */}
          <div className="md:col-span-2 flex justify-end">
           <Button size="lg" className="bg-theme-primary text-white">
  {editMode ? "Update Customer" : "Add Customer"}
</Button>

          </div>
        </form>
      </div>
    </div>
  );
}
