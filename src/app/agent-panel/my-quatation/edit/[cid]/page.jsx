"use client";
import { useSearchParams } from "next/navigation";
import React, { use } from "react";

const EditPage = ({ params }) => {
  const { cid } = use(params);
  return <div>EditPage {cid}</div>;
};

export default EditPage;
