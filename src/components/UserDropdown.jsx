"use client";

import { ChevronDown, LogOut, UserCircle2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { signOut } from "firebase/auth";

import { auth } from "@/firebase/config";
import { Button } from "./ui/button";

const UserDropdown = ({ user }) => {
  if (!user) return null;

  const { name, email, role, photoURL } = user;
  const [imgSrc, setImgSrc] = useState(photoURL ?? "/profile.png");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-gray-50"
      >
        <img
          src={imgSrc}
          alt="Profile"
          width={32}
          height={32}
          onError={() => setImgSrc("./images/user-img.jpg")}
          className="rounded-full border border-gray-200"
        />
        <span className="text-sm font-medium text-gray-700">{name ?? "user"}</span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
            isDropdownOpen ? "rotate-180 transform" : ""
          }`}
        />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-gray-100 bg-white py-2 shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-medium text-gray-900">{name ?? "user"}</p>
            <p className="text-[12px] text-gray-500">{email}</p>
            <p className="text-[12px] text-gray-500">Role: {role}</p>
          </div>

          <div className="border-b border-gray-100 px-2 py-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDropdownOpen(false);
                router.push("/profile");
              }}
              className="w-full justify-start px-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <UserCircle2 className="mr-2 h-4 w-4" />
              Profile
            </Button>
          </div>

          <div className="border-t border-gray-100 py-2">
            <Button
              onClick={async () => {
                try {
                  await signOut(auth);
                  setIsDropdownOpen(false);
                  toast.success("Logged out");
                  router.replace("/login");
                } catch (error) {
                  toast.error(error.message);
                }
              }}
              className="w-full cursor-pointer bg-transparent px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </div>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
