"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, User, X } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/utils";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import { canvasPreview } from "./canvasPreview"

interface Profile {
  fullName: string;
  email: string;
  telephone: string;
  image: string | null;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export default function ProfileSettings() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({
    fullName: session?.user?.name || "",
    email: session?.user?.email || "",
    telephone: "",
    image: session?.user?.image || null,
  });

  // Image crop state
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number>(1 / 1); // Square aspect ratio
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (completedCrop?.width && completedCrop?.height && imgRef.current && previewCanvasRef.current) {
      canvasPreview(
        imgRef.current,
        previewCanvasRef.current,
        completedCrop
      );
    }
  }, [completedCrop]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/therapist/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setProfileImage(data.image);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setCrop(undefined); // Makes crop preview update between images
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImgSrc(reader.result?.toString() || "");
        setShowCropModal(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleImageCrop = async () => {
    try {
      setIsLoading(true);
      
      if (!completedCrop || !previewCanvasRef.current) {
        throw new Error("Crop not completed");
      }

      // Get the cropped image as blob
      previewCanvasRef.current.toBlob((blob) => {
        if (!blob) {
          throw new Error("Failed to create blob");
        }

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          setProfileImage(base64data);

          // Update profile with new image
          const response = await fetch("/api/therapist/settings", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image: base64data,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to update profile image");
          }

          window.location.reload();
          toast.success("Profile image updated successfully");
        };
      }, "image/jpeg", 0.9); // 0.9 = quality

    } catch (error) {
      console.error("Error cropping image:", error);
      toast.error("Failed to crop image");
    } finally {
      setIsLoading(false);
      setShowCropModal(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/therapist/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: profile.fullName,
          telephone: profile.telephone,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      // Update session with new name
      await update({
        ...session,
        user: {
          ...session?.user,
          name: profile.fullName,
        },
      });

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/therapist/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update password");
      }

      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password update error:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {showCropModal && (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Crop your profile picture</h3>
        <button 
          onClick={() => setShowCropModal(false)}
          className="p-1 rounded-full hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {imgSrc && (
        <div className="flex flex-col md:flex-row gap-6">
          {/* Original image with enhanced crop selection */}
          <div className="flex-1">
            <h4 className="text-sm font-medium mb-2">Original Image (Drag to select area)</h4>
            <div className="relative border-2 border-dashed border-gray-300 rounded-md overflow-hidden bg-gray-50">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                ruleOfThirds
                minWidth={100}
                minHeight={100}
                className="max-h-[60vh]"
                style={{
                  cursor: 'crosshair',
                }}
                cropSize={{
                  width: 300,
                  height: 300,
                }}
              >
                <img
                  ref={imgRef}
                  alt="Original image to crop"
                  src={imgSrc}
                  style={{ 
                    maxHeight: "60vh",
                    maxWidth: "100%",
                    objectFit: "contain",
                    display: "block"
                  }}
                  onLoad={(e) => {
                    const { width, height } = e.currentTarget;
                    setCrop(centerAspectCrop(width, height, aspect));
                  }}
                />
              </ReactCrop>
            </div>
          </div>

          {/* Preview section remains the same */}
          <div className="flex-1">
            <h4 className="text-sm font-medium mb-2">Preview</h4>
            <div className="border-2 border-dashed border-gray-300 rounded-md p-4 bg-gray-50 flex items-center justify-center">
              {completedCrop ? (
                <div className="flex flex-col items-center">
                  <canvas
                    ref={previewCanvasRef}
                    style={{
                      width: '200px',
                      height: '200px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #3b82f6',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    This is how your profile picture will appear
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <p>Select an area on the left to see preview</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCropModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleImageCrop}
                disabled={isLoading || !completedCrop}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? "Processing..." : "Save Profile Picture"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
)}

      <Card className="p-6 bg-white">
        <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileImage || undefined} />
              <AvatarFallback>
                <User className="h-10 w-10 text-gray-400" />
              </AvatarFallback>
            </Avatar>
            <div>
              <Button type="button" variant="outline" className="relative text-gray-700 hover:text-gray-900 border-gray-200 bg-white hover:bg-white cursor-pointer">
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={onSelectFile}
                  accept="image/*"
                />
                <Upload className="h-4 w-4 mr-2" />
                Upload Photo
              </Button>
              <p className="text-sm text-gray-500 mt-1">
                JPG, PNG or GIF. Max size of 5MB.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-gray-900">Full Name</Label>
              <Input
                id="fullName"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="bg-white text-gray-900 border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900">Email</Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-gray-50 text-gray-500 border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone" className="text-gray-900">Phone Number</Label>
              <Input
                id="telephone"
                value={profile.telephone}
                onChange={(e) => setProfile({ ...profile, telephone: e.target.value })}
                className="bg-white text-gray-900 border-gray-200"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Card>

      <Card className="p-6 bg-white">
        <h2 className="text-xl font-semibold mb-6">Change Password</h2>
        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-gray-900">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-white text-gray-900 border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-gray-900">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-white text-gray-900 border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-900">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-white text-gray-900 border-gray-200"
            />
          </div>

          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white w-full"
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}