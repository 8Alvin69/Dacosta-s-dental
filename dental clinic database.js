// Add to your site:  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
//                    <script src="dental-db.js"></script>   (put both just before </body>)
const SUPABASE_URL = "PASTE_PROJECT_URL";        // Supabase > Project Settings > API
const SUPABASE_KEY = "PASTE_ANON_PUBLIC_KEY";    // the anon/public key (safe in browser because of RLS)
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- CHANGE THESE IDs to match your HTML (inspect each input) ----
const $ = id => document.getElementById(id);
const val = id => ($(id) && $(id).value.trim()) || null;
const chk = id => !!($(id) && $(id).checked);

// Registration form
async function registerPatient(e) {
  e.preventDefault();
  const { error } = await db.from("patients").insert({
    first_name: val("reg-first"), last_name: val("reg-last"),
    date_of_birth: val("reg-dob"), gender: val("reg-gender"),
    email: val("reg-email").toLowerCase(), phone: val("reg-phone"),
    area_postcode: val("reg-area"), address: val("reg-address"),
    gp_name: val("reg-gp"), allergies: val("reg-allergies"),
    medications: val("reg-meds"), emergency_name: val("reg-emname"),
    emergency_phone: val("reg-emphone"),
    data_consent: chk("reg-consent"), reminders_optin: chk("reg-reminders")
  });
  if (error) return alert(error.code === "23505" ? "This email is already registered." : "Error: " + error.message);
  alert("Registration successful!"); e.target.reset();
}

// Booking form
async function bookAppointment(e) {
  e.preventDefault();
  const { error } = await db.rpc("book_appointment", {
    p_email: val("book-email"), p_treatment: val("book-treatment"),
    p_dentist: val("book-dentist") === "No preference" ? null : val("book-dentist"),
    p_date: val("book-date"), p_time: val("book-time"),
    p_notes: val("book-notes"), p_reminders: chk("book-reminders")
  });
  if (error) {
    if (error.message.includes("NOT_REGISTERED")) return alert("Please register first.");
    if (error.code === "23505") return alert("That slot is taken. Choose another time.");
    return alert("Error: " + error.message);
  }
  alert("Appointment booked!"); e.target.reset();
}

// Contact form
async function sendEnquiry(e) {
  e.preventDefault();
  const { error } = await db.from("enquiries").insert({
    first_name: val("c-first"), last_name: val("c-last"), email: val("c-email"),
    phone: val("c-phone"), subject: val("c-subject"), message: val("c-message")
  });
  if (error) return alert("Error: " + error.message);
  alert("Message sent!"); e.target.reset();
}

// Staff portal: real login instead of the hard-coded admin/dental123
async function staffLogin(email, password) {
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return alert("Login failed"); loadDashboard();
}
async function loadDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() - 7 * 864e5).toISOString();
  const count = async (q) => (await q).count ?? 0;
  const n = {
    total:  await count(db.from("patients").select("*", { count: "exact", head: true })),
    recent: await count(db.from("patients").select("*", { count: "exact", head: true }).gte("registered_at", week)),
    today:  await count(db.from("appointments").select("*", { count: "exact", head: true }).eq("appointment_date", today)),
    future: await count(db.from("future_appointments").select("*", { count: "exact", head: true })),
  };
  console.log(n); // put these numbers into your four dashboard cards
  const patients = (await db.from("patients").select("*").order("registered_at", { ascending: false })).data;
  const future   = (await db.from("future_appointments").select("*")).data;
  const past     = (await db.from("past_appointments").select("*")).data;
  return { n, patients, future, past }; // render into your existing tables
}

// Wire up (change the form IDs)
$("register-form")?.addEventListener("submit", registerPatient);
$("booking-form")?.addEventListener("submit", bookAppointment);
$("contact-form")?.addEventListener("submit", sendEnquiry);
