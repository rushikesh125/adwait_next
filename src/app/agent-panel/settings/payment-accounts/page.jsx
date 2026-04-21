"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  createPaymentAccount,
  getPaymentAccountsByAgent,
  updatePaymentAccount,
  deletePaymentAccount,
  setDefaultPaymentAccount,
} from "@/firebase/paymentAccountsService";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Star,
  Edit3,
  Building2,
  Banknote,
  Smartphone,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";

const ACCOUNT_TYPES = ["Bank", "Cash", "UPI", "Other"];

const TYPE_ICONS = {
  Bank: Building2,
  Cash: Banknote,
  UPI: Smartphone,
  Other: MoreHorizontal,
};

const emptyAccountForm = () => ({
  name: "",
  type: "Bank",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  upiId: "",
  isDefault: false,
});

export default function PaymentAccountsPage() {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const agentId = user?.uid;

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAccountForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      try {
        const data = await getPaymentAccountsByAgent(agentId);
        setAccounts(data);
      } catch {
        toast.error("Failed to load payment accounts");
      } finally {
        setLoading(false);
      }
    })();
  }, [agentId]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyAccountForm());
    setDialogOpen(true);
  };

  const openEdit = (account) => {
    setEditingId(account.id);
    setForm({
      name: account.name || "",
      type: account.type || "Bank",
      bankName: account.bankName || "",
      accountNumber: account.accountNumber || "",
      ifscCode: account.ifscCode || "",
      upiId: account.upiId || "",
      isDefault: account.isDefault || false,
    });
    setDialogOpen(true);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Account name is required"); return; }
    setSaving(true);
    try {
      if (editingId) {
        await updatePaymentAccount(editingId, form);
        setAccounts((prev) => prev.map((a) => a.id === editingId ? { ...a, ...form } : a));
        toast.success("Account updated");
      } else {
        const id = await createPaymentAccount(agentId, form);
        setAccounts((prev) => [...prev, { id, ...form, isActive: true }]);
        toast.success("Account created");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this payment account?")) return;
    setDeletingId(id);
    try {
      await deletePaymentAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Account removed");
    } catch {
      toast.error("Failed to remove account");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultPaymentAccount(agentId, id);
      setAccounts((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
      toast.success("Default account updated");
    } catch {
      toast.error("Failed to update default");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-black text-lg text-slate-900 tracking-tight">Payment Accounts</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Set up bank accounts, cash registers, and UPI handles for payment tracking
              </p>
            </div>
          </div>
          <Button
            onClick={openCreate}
            className="rounded-xl font-bold h-9 bg-theme-primary hover:bg-theme-primary/90 text-white text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Account
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
          </div>
        ) : accounts.length === 0 ? (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Building2 className="w-12 h-12 mb-3 text-slate-200" />
              <p className="font-medium mb-1">No payment accounts set up</p>
              <p className="text-sm text-slate-400 text-center max-w-xs">
                Add bank accounts, cash registers, or UPI handles to track where payments are received.
              </p>
              <Button variant="outline" className="mt-5 rounded-xl" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1.5" /> Add your first account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => {
              const Icon = TYPE_ICONS[acc.type] || MoreHorizontal;
              return (
                <Card key={acc.id} className="rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <Icon className="w-5 h-5 text-theme-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{acc.name}</span>
                          {acc.isDefault && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 space-x-2">
                          <span>{acc.type}</span>
                          {acc.bankName && <span>· {acc.bankName}</span>}
                          {acc.accountNumber && (
                            <span>· ****{acc.accountNumber.slice(-4)}</span>
                          )}
                          {acc.upiId && <span>· {acc.upiId}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!acc.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-300 hover:text-amber-500 hover:bg-amber-50"
                          title="Set as default"
                          onClick={() => handleSetDefault(acc.id)}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-theme-primary hover:bg-blue-50"
                        onClick={() => openEdit(acc)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50"
                        disabled={deletingId === acc.id}
                        onClick={() => handleDelete(acc.id)}
                      >
                        {deletingId === acc.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black text-slate-900">
              {editingId ? "Edit Account" : "Add Payment Account"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Account Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className="rounded-xl"
                placeholder='e.g. "HDFC Current Account", "Office Cash"'
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Account Type</Label>
              <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.type === "Bank" && (
              <>
                <div>
                  <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Bank Name</Label>
                  <Input
                    value={form.bankName}
                    onChange={(e) => setField("bankName", e.target.value)}
                    className="rounded-xl"
                    placeholder="e.g. HDFC, SBI, ICICI"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Account Number</Label>
                  <Input
                    value={form.accountNumber}
                    onChange={(e) => setField("accountNumber", e.target.value)}
                    className="rounded-xl"
                    placeholder="Last 4 digits shown on records"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500 mb-1.5 block">IFSC Code</Label>
                  <Input
                    value={form.ifscCode}
                    onChange={(e) => setField("ifscCode", e.target.value)}
                    className="rounded-xl"
                    placeholder="e.g. HDFC0001234"
                  />
                </div>
              </>
            )}

            {form.type === "UPI" && (
              <div>
                <Label className="text-xs font-bold text-slate-500 mb-1.5 block">UPI ID</Label>
                <Input
                  value={form.upiId}
                  onChange={(e) => setField("upiId", e.target.value)}
                  className="rounded-xl"
                  placeholder="example@upi"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setField("isDefault", !form.isDefault)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  form.isDefault
                    ? "bg-theme-primary border-theme-primary"
                    : "border-slate-300 hover:border-theme-primary"
                }`}
              >
                {form.isDefault && <Check className="w-3 h-3 text-white" />}
              </button>
              <Label className="text-sm text-slate-600 cursor-pointer" onClick={() => setField("isDefault", !form.isDefault)}>
                Set as default payment account
              </Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-theme-primary hover:bg-theme-primary/90 text-white font-bold"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Update" : "Add Account"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
