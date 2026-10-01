// Shared with the admin app so both sites agree on who's a valid member.
// NOTE: this is a client-side placeholder for prototyping only. In
// production, replace this with a real backend/auth API call — anything
// shipped in a browser bundle can be read by anyone, credentials included.
export const MEMBER_CREDENTIALS = Object.freeze({
  id: "member",
  password: "member123",
});

export const ADMIN_CREDENTIALS = Object.freeze({
  id: "admin",
  password: "admin123",
});
