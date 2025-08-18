"use client";

const BackgroundBlobs = () => {
  return (
    <div className="absolute inset-0 -z-0 overflow-hidden">
      <div
        className="absolute -top-1/4 -left-1/4 h-1/2 w-1/2 rounded-full bg-white/20 opacity-50 animate-blob-float"
        style={{ animationDelay: '0s', animationDuration: '15s' }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-white/10 opacity-50 animate-blob-float"
        style={{ animationDelay: '3s', animationDuration: '18s' }}
      />
      <div
        className="absolute bottom-1/4 -left-1/3 h-1/3 w-1/3 rounded-full bg-white/15 opacity-50 animate-blob-float"
        style={{ animationDelay: '6s', animationDuration: '12s' }}
      />
    </div>
  );
};

export default BackgroundBlobs;
