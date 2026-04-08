"use client";
import {
  ChevronDown,
  HelpCircle,
  Link2,
  LogOut,
  Settings,
  Shield,
  User,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/config";
import { Button } from "./ui/button";

const UserDropdown = ({ user }) => {
  if (!user) {
    return null; // or a loader / skeleton
  }

  const { name, email, role, uid, photoURL } = user;
  const [imgSrc, setImgSrc] = useState(photoURL ?? "/profile.png");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const enquiryLink =
    typeof window !== "undefined" && role === "agent"
      ? `${window.location.origin}/enquiry/${uid}`
      : "";
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    router.push("/login");
  };

  const handleCopyLink = async () => {
    if (!enquiryLink) return;
    try {
      await navigator.clipboard.writeText(enquiryLink);
      setCopied(true);
      toast.success("Enquiry link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Could not copy the link");
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-gray-50"
        >
          <img
            src={imgSrc}
            alt="Profile"
            width={32}
            height={32}
            onError={() => setImgSrc("./images/user-img.jpg")}
            className="rounded-full border border-gray-200"
          />
          <span className="text-sm font-medium text-gray-700">
            {name ?? "user"}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              isDropdownOpen ? "transform rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">
                { name?? "user"}
              </p>
              <p className="text-[12px] text-gray-500">{email}</p>
              <p className="text-[12px] text-gray-500">Role:{role}</p>
            </div>

            {role === "agent" && (
              <div className="border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <Link2 className="h-3.5 w-3.5" />
                  Enquiry Link
                </div>
                <p className="mt-2 break-all text-[12px] text-gray-600">
                  {enquiryLink}
                </p>
                <Button
                  onClick={handleCopyLink}
                  className="mt-3 h-8 w-full bg-theme-primary text-xs text-white"
                >
                  {copied ? "Copied" : "Copy Link"}
                </Button>
              </div>
            )}

            {/* <div className="py-2">
              <Link
                href={`/dashboard`}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Dashboard
              </Link>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Privacy
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Help Center
              </button>
            </div> */}

            <div className="border-t border-gray-100 py-2">
              <Button
                onClick={() => {
                  signOut(auth)
                    .then(() => {
                      toast.success("Logged out");
                    })
                    .catch((error) => {
                      toast.error(error.message);
                    });
                    router.push('/login')
                }}
                className="bg-transparent cursor-pointer w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UserDropdown;
