import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { User, Lock, Upload, Image as ImageIcon, X, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getImageUrl } from "@/api/posts";
import { requestPresignedUrl, uploadToS3 } from "@/api/images";

export function EditProfileModal() {
  const { user, isEditProfileOpen, closeEditProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImageKey, setProfileImageKey] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form state when modal opens or user updates
  useEffect(() => {
    if (isEditProfileOpen && user) {
      setUsername(user.username || "");
      setNewPassword("");
      setConfirmPassword("");
      setProfileImageKey(user.profileImageKey || null);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [isEditProfileOpen, user]);

  const passwordMismatch = Boolean(
    newPassword && confirmPassword && newPassword !== confirmPassword
  );

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get pre-signed URL from backend
      const presignResponse = await requestPresignedUrl({
        fileName: selectedFile.name,
        contentType: selectedFile.type,
        fileSize: selectedFile.size,
      });

      // 2. Upload directly to S3
      await uploadToS3(
        presignResponse.uploadUrl,
        presignResponse.httpMethod,
        selectedFile,
        (pct) => setUploadProgress(pct)
      );

      setProfileImageKey(presignResponse.objectKey);
      toast.success("Avatar image uploaded successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload avatar image";
      toast.error("Upload failed", { description: msg });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordMismatch) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const oldUsername = user?.username;
      const response = await updateUserProfile({
        username: username.trim(),
        newPassword: newPassword ? newPassword : undefined,
        confirmPassword: confirmPassword ? confirmPassword : undefined,
        profileImageKey: profileImageKey,
      });

      toast.success("Profile updated successfully!");

      // If user updated their username while viewing their own profile page, navigate to new URL
      if (oldUsername && response.user.username !== oldUsername) {
        if (location.pathname.toLowerCase() === `/users/${oldUsername.toLowerCase()}`) {
          navigate(`/users/${response.user.username}`, { replace: true });
        }
      }

      closeEditProfile();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update profile";
      toast.error("Update failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarSrc = profileImageKey
    ? profileImageKey.startsWith("http")
      ? profileImageKey
      : getImageUrl(profileImageKey)
    : undefined;

  return (
    <Dialog open={isEditProfileOpen} onOpenChange={(open) => !open && closeEditProfile()}>
      <DialogContent className="max-w-md bg-black/95 text-white border-white/10 backdrop-blur-xl shadow-2xl p-6">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <User className="size-5 text-orange-400" />
            Edit Profile
          </DialogTitle>
          <DialogDescription className="text-white/60 text-xs">
            Update your account details, profile picture, or change your password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 my-2">
          {/* Avatar Selection Section */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
            <Avatar className="size-16 border-2 border-white/20 shadow-md shrink-0">
              <AvatarImage src={avatarSrc} alt={username} />
              <AvatarFallback className="bg-orange-500/20 text-orange-400 font-extrabold text-xl">
                {username ? username.slice(0, 2).toUpperCase() : "CR"}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <span className="text-xs font-semibold text-white/80">Profile Picture</span>
              
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
                
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="size-3 animate-spin mr-1" />
                      {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="size-3 mr-1" />
                      Upload Photo
                    </>
                  )}
                </Button>

                {profileImageKey && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setProfileImageKey(null)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <X className="size-3 mr-1" />
                    Remove
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                <ImageIcon className="size-3 text-white/40" />
                <input
                  type="text"
                  placeholder="Or paste image URL..."
                  value={profileImageKey || ""}
                  onChange={(e) => setProfileImageKey(e.target.value || null)}
                  className="w-full bg-transparent text-[11px] text-white/70 placeholder:text-white/30 border-b border-white/10 focus:border-orange-400 outline-none pb-0.5"
                />
              </div>
            </div>
          </div>

          {/* Username Input */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-username" className="text-xs font-semibold text-white/70">
              Username
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 size-4 text-white/40" />
              <Input
                id="edit-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500"
                placeholder="Enter username"
              />
            </div>
          </div>

          {/* Password Section */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
            <span className="text-xs font-semibold text-white/70">
              Change Password <span className="text-white/40 font-normal">(optional)</span>
            </span>

            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-white/40" />
                <Input
                  id="edit-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500"
                  placeholder="New password (min 6 chars)"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-white/40" />
                <Input
                  id="edit-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500 ${
                    passwordMismatch ? "border-red-500 focus-visible:ring-red-500" : ""
                  }`}
                  placeholder="Confirm new password"
                />
              </div>
              {passwordMismatch && (
                <p className="text-[11px] text-red-400 font-medium ml-1">
                  Passwords do not match
                </p>
              )}
              {!passwordMismatch && newPassword && confirmPassword && (
                <p className="text-[11px] text-emerald-400 font-medium ml-1 flex items-center gap-1">
                  <Check className="size-3" /> Passwords match
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={closeEditProfile}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || isUploading || passwordMismatch}
              className="bg-orange-500 text-white hover:bg-orange-600 font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
