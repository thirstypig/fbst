
import { prisma } from "../../db/prisma.js";
import type { AuthProviderProfile } from "../providers/index.js";

/**
 * Access Control Settings
 */
const ADMIN_EMAILS = new Set(
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

const ALLOWED_EMAILS = new Set(
  String(process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

export class AuthService {

  /**
   * Determine if an email is allowed to access the system.
   */
  static isEmailAllowed(email: string): boolean {
    if (ALLOWED_EMAILS.size === 0) return true; // Open access if allowlist empty
    return ALLOWED_EMAILS.has(email.toLowerCase());
  }

  /**
   * Determine if an email should be granted admin privileges.
   */
  static isAdmin(email: string): boolean {
    return ADMIN_EMAILS.has(email.toLowerCase());
  }

  /**
   * Handles user login/registration from an external provider (Google/Yahoo).
   * Creates or updates the user record based on the profile.
   * Throws Error if email is not allowed.
   */
  static async loginOrRegisterProvider(profile: AuthProviderProfile) {
    const email = profile.email.toLowerCase();

    if (!AuthService.isEmailAllowed(email)) {
      throw new Error("Access Denied: Email not in allowlist");
    }

    const name = profile.name || null;
    const avatarUrl = profile.avatarUrl || null;
    const isAdmin = AuthService.isAdmin(email);

    // Dynamic field names based on provider
    const providerIdField = profile.provider === "google" ? "googleSub" : "yahooSub";
    const providerIdValue = profile.sub;

    const User = prisma.user; 

    // 1. Find by Provider ID
    // Construct dynamic where clause safely
    const whereClause = profile.provider === "google" 
        ? { googleSub: providerIdValue }
        : { yahooSub: providerIdValue };

    let user = await User.findUnique({
      where: whereClause
    });

    if (!user) {
      // 2. Fallback: Find by Email (Account Linking)
      const existingByEmail = await User.findUnique({ where: { email } });
      
      if (existingByEmail) {
        // Link Account
        const updateData: any = {
           [providerIdField]: providerIdValue,
           name: name || existingByEmail.name,
           avatarUrl: avatarUrl || existingByEmail.avatarUrl,
        };
        // Promote to admin if configured in env vars, otherwise keep existing status
        if (isAdmin) updateData.isAdmin = true;

        user = await User.update({
          where: { id: existingByEmail.id },
          data: updateData,
        });
      } else {
        // 3. Create New User
        user = await User.create({
          data: {
            email,
            [providerIdField]: providerIdValue,
            name,
            avatarUrl,
            isAdmin,
          },
        });
      }
    } else {
      // 4. Update Existing User (Refresh Profile)
      const updateData: any = {
          email, // Ensure email is fresh?
          name: name || user.name,
          avatarUrl: avatarUrl || user.avatarUrl,
      };
      if (isAdmin) updateData.isAdmin = true;

      user = await User.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    return user;
  }
}
