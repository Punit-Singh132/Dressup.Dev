import axios from "axios";
import React, { useEffect, useState } from "react";
import { backendUrl, currency } from "../App";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const List = ({ token }) => {
  const [list, setList] = useState([]);

  const fetchList = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/product/list`, {
        headers: { token },
      });

      if (response.data.success) {
        setList(response.data.products);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to fetch products");
    }
  };

  const removeProduct = async (id) => {
    try {
      const response = await axios.post(
        `${backendUrl}/api/product/remove`,
        { id },
        { headers: { token } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        fetchList();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to remove product");
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <main className="flex flex-col gap-2">
      <p className="mb-2 font-semibold">All Products List</p>

      {/* List Table Title */}
      <div className="hidden md:grid grid-cols-[1fr_3fr_1fr_1fr_1fr] items-center py-2 px-4 border-b border-gray-200 text-sm font-bold">
        <p>Image</p>
        <p>Name</p>
        <p>Category</p>
        <p>Price</p>
        <p className="text-center">Action</p>
      </div>

      {/* List All Products */}
      {list.length > 0 ? (
        list.map((item, index) => (
          <div
            key={index}
            className="md:grid grid-cols-[1fr_3fr_1fr_1fr_1fr] items-center py-2 px-4 border-b border-gray-100 text-sm"
          >
            <img className="w-12 h-12 object-cover" src={item.image[0]} alt={item.name} />
            <p>{item.name}</p>
            <p>{item.category}</p>
            <p>{currency}{item.price}</p>
            <p
              className="text-right md:text-center cursor-pointer text-lg text-red-500 hover:text-red-700 transition"
              onClick={() => removeProduct(item._id)}
            >
              ✖
            </p>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-center py-4">No products available</p>
      )}
    </main>
  );
};

export default List;
