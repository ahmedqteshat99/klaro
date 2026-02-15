import { z } from "zod";

export const emailSchema = z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein.");

// Keep login permissive so legacy users can still sign in with older passwords.
export const loginPasswordSchema = z.string().min(6, "Das Passwort muss mindestens 6 Zeichen haben.");

// Enforce strong passwords for new sign-ups and password resets.
export const signupPasswordSchema = z.string()
  .min(12, "Das Passwort muss mindestens 12 Zeichen haben.")
  .regex(/[A-Z]/, "Das Passwort muss mindestens einen Großbuchstaben enthalten.")
  .regex(/[a-z]/, "Das Passwort muss mindestens einen Kleinbuchstaben enthalten.")
  .regex(/[0-9]/, "Das Passwort muss mindestens eine Ziffer enthalten.")
  .regex(/[^A-Za-z0-9]/, "Das Passwort muss mindestens ein Sonderzeichen enthalten.");

export const nameSchema = z.string().min(2, "Der Name muss mindestens 2 Zeichen haben.");
