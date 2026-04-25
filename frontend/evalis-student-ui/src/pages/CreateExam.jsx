import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createExam, updateExam } from "../services/api";
import SuccessModal from "../components/SuccessModal";

export default function CreateExam() {
  const navigate = useNavigate();
  const location = useLocation();

  const editData = location.state;
  const isEdit = !!editData;

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // =========================
  // STATE
  // =========================
  const [form, setForm] = useState({
    exam_name: editData?.exam_name || "",
    subject_code: editData?.subject_code || "",
    instructor_email: editData?.instructor_email || user?.email || "",
    semester: editData?.semester || "",
    exam_type: editData?.exam_type || "",
    pattern: editData?.pattern || "",
    units: editData?.units || [],
    duration_minutes: editData?.duration_minutes || "",
  });

  const [unitsInput, setUnitsInput] = useState(
    editData?.units ? editData.units.join(", ") : "",
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ SUCCESS STATES
  const [successTitle, setSuccessTitle] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // =========================
  // HANDLE CHANGE
  // =========================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // =========================
  // UNITS
  // =========================
  const handleUnitsChange = (e) => {
    const raw = e.target.value;
    setUnitsInput(raw);

    const values = raw
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v !== "");

    setForm({ ...form, units: values });
  };

  // =========================
  // VALIDATION
  // =========================
  const validate = () => {
    if (
      !form.exam_name ||
      !form.subject_code ||
      !form.instructor_email ||
      !form.exam_type ||
      !form.pattern ||
      form.units.length === 0
    ) {
      setError("Please fill all required fields.");
      return false;
    }
    return true;
  };

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async () => {
    try {
      setError("");
      if (!validate()) return;

      setLoading(true);

      let res;

      if (isEdit) {
        await updateExam(editData.exam_id, form);

        setSuccessTitle("Exam Updated ✅");
        setSuccessMessage("Your changes have been saved successfully.");
      } else {
        res = await createExam(form);

        setSuccessTitle("Exam Created");
        setSuccessMessage("Your exam skeleton is ready. Redirecting...");
      }

      setShowSuccess(true);

      setTimeout(() => {
        const id = isEdit ? editData.exam_id : res.data.exam_id;
        setShowSuccess(false);
        navigate(`/exam/${id}/preview`);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white flex justify-center items-start p-8">
      <div className="w-full max-w-5xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-8">
        {/* HEADER */}
        <h1 className="text-2xl font-semibold mb-6">
          {isEdit ? "Edit Examination" : "Create Examination"}
        </h1>

        {/* ERROR */}
        {error && <div className="text-red-400 mb-4">{error}</div>}

        <div className="grid grid-cols-2 gap-8">
          {/* LEFT */}
          <div className="space-y-4">
            <Input
              label="Exam Name"
              name="exam_name"
              value={form.exam_name}
              onChange={handleChange}
            />
            <Input
              label="Subject Code"
              name="subject_code"
              value={form.subject_code}
              onChange={handleChange}
            />
            <Input
              label="Instructor Email (Auto-filled)"
              name="instructor_email"
              value={form.instructor_email}
              disabled
              onChange={handleChange}
              className="opacity-70 bg-white dark:bg-slate-800/50 cursor-not-allowed"
            />
            <Input
              label="Semester"
              name="semester"
              value={form.semester}
              onChange={handleChange}
            />
            <Input
              label="Duration"
              name="duration_minutes"
              value={form.duration_minutes}
              onChange={handleChange}
            />
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <Select
              label="Exam Type"
              name="exam_type"
              value={form.exam_type}
              onChange={handleChange}
              options={[
                { value: "mst", label: "MST" },
                { value: "final", label: "Final" },
              ]}
            />

            <Select
              label="Pattern"
              name="pattern"
              value={form.pattern}
              onChange={handleChange}
              options={[
                { value: "mcq", label: "MCQ" },
                { value: "coding", label: "Coding" },
                { value: "mixed", label: "Mixed" },
              ]}
            />

            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">Target Units (Comma Separated)</label>
              <input
                value={unitsInput}
                onChange={handleUnitsChange}
                placeholder="e.g. 1, 2, 3"
                className="input-dark mt-1"
              />
            </div>

            {/* REAL-TIME MATH FEEDBACK */}
            {form.exam_type && (
              <div className="bg-white dark:bg-slate-800/40 border border-gray-300 dark:border-slate-700 p-4 rounded-xl mt-6">
                <span className="block text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">
                  System Policy Locked
                </span>
                <span className="text-xl font-bold flex items-center gap-2">
                  Total Marks: <span className="text-blue-400">{form.exam_type === "mst" ? "50" : "100"}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* BUTTON */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded disabled:opacity-50"
          >
            {loading
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
                ? "Update Exam"
                : "Create Exam"}
          </button>
        </div>

        {/* SUCCESS MODAL */}
        {showSuccess && (
          <SuccessModal title={successTitle} message={successMessage} />
        )}
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

const Input = ({ label, name, value, onChange }) => (
  <div>
    <label className="text-sm text-slate-500 dark:text-slate-400">{label}</label>
    <input
      name={name}
      value={value}
      onChange={onChange}
      className="input-dark mt-1"
    />
  </div>
);

const Select = ({ label, name, value, onChange, options }) => (
  <div>
    <label className="text-sm text-slate-500 dark:text-slate-400">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="input-dark mt-1"
    >
      <option value="">Select</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);
