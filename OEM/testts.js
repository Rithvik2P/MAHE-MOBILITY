
import React, {useState} from "react";

const OTHER_MACHINE_IP = '127.0.0.1'; 



const res = await fetch(`http://${OTHER_MACHINE_IP}:3000/push-update`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json','apikey':"0x1234",'version':"7.0" },
  body: JSON.stringify({ }),
});

const data = await res.json();
console.log(data);