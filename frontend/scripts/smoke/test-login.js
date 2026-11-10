fetch("http://localhost:8080/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@lawconnect.com", password: "admin123", role: "admin" })
})
.then(async r => console.log(r.status, await r.text()))
.catch(console.error);
