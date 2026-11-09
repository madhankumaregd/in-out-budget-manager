export const validatePassword = (password) => {
  if (!password) {
    return "Password is required";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter (A-Z)";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter (a-z)";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number (0-9)";
  }
  if (!/[!@#$%^&*(),.?":{}|<>\-_=+\\\/~`\[\]]/.test(password)) {
    return "Password must contain at least one special symbol (!@#$%^&*...)";
  }
  return null;
};

