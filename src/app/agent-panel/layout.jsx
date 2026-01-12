"use client";
import { useRouter } from "next/navigation";
import React from "react";
import { useSelector } from "react-redux";
import Loading from "../loading";
import Page403 from "@/components/Page403";

const AgentPanelLayout = ({ children }) => {
  const { user, loading, initialized } = useSelector((state) => state.auth);
  const router = useRouter();
  if(loading){
    return <Loading/>
  }
  if(initialized && user.role !== "agent"){
    return <Page403/>
  }
  return <div>{children}</div>;
};

export default AgentPanelLayout;
