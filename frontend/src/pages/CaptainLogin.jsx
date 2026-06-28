import React, { useState } from "react";
import { Link } from "react-router-dom";

const CaptainLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
   const [captainData, setCaptainData] = useState({
    email: "",
    password: ""
  });
  const submitHandler = (e) => {
    e.preventDefault();
     setCaptainData({
      email: email,
      password: password
    });
    console.log(captainData);
    setEmail("");
    setPassword("");
  };

  return (
    <div className="h-screen flex flex-col justify-between bg-white">
      {/* Top Section */}
      <div className="p-7">
        {/* Uber Logo */}
        <img
          className="w-16 mb-10"
          src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png"
          alt="Uber Logo"
        />

        <form onSubmit={submitHandler}>
          <h3 className="text-xl font-medium mb-2">
            Captain's Email
          </h3>

          <input
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="captain@example.com"
            className="bg-[#eeeeee] mb-7 rounded px-4 py-3 border w-full text-lg placeholder:text-gray-500 focus:outline-none"
          />

          <h3 className="text-xl font-medium mb-2">
            Enter Password
          </h3>

          <input
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="bg-[#eeeeee] mb-7 rounded px-4 py-3 border w-full text-lg placeholder:text-gray-500 focus:outline-none"
          />

          <button
            type="submit"
            className="bg-[#111] text-white font-semibold rounded px-4 py-3 w-full mb-3"
          >
            Login as Captain
          </button>

          <p className="text-center text-sm">
            Want to ride instead?{" "}
            <Link
              to="/login"
              className="text-blue-600 font-medium"
            >
              User Login
            </Link>
          </p>
        </form>
      </div>

      {/* Bottom Section */}
      <div className="p-7">
        <Link
          to="/captain-signup"
          className="flex items-center justify-center bg-[#dab900] text-white font-semibold rounded px-4 py-3 w-full"
        >
          Register as Captain
        </Link>
      </div>
    </div>
  );
};

export default CaptainLogin;