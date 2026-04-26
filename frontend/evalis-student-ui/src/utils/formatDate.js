export const formatDateTime = (isoString) => {
  if (!isoString) return "—";
  
  // PyMongo returns naive datetimes for UTC, so append 'Z' if missing timezone offset
  let cleanString = isoString;
  if (!cleanString.endsWith('Z') && !cleanString.includes('+', 10) && !cleanString.includes('-', 10)) {
      cleanString += 'Z';
  }
  
  const date = new Date(cleanString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export const formatDateOnly = (isoString) => {
  if (!isoString) return "—";
  
  let cleanString = isoString;
  if (!cleanString.endsWith('Z') && !cleanString.includes('+', 10) && !cleanString.includes('-', 10)) {
      cleanString += 'Z';
  }
  
  const date = new Date(cleanString);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOfWeek = dayNames[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${dayOfWeek}, ${day}/${month}/${year}`;
};

export const formatTimeOnly = (isoString) => {
  if (!isoString) return "—";
  
  let cleanString = isoString;
  if (!cleanString.endsWith('Z') && !cleanString.includes('+', 10) && !cleanString.includes('-', 10)) {
      cleanString += 'Z';
  }
  
  const date = new Date(cleanString);

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strTime = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;

  return strTime;
};
