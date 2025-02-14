import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Crop, Check } from 'lucide-react';
import { socket } from './socket';
import { Progress } from './components/Progress';

export default function VideoCropper() {
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [size, setSize] = React.useState({ width: 208, height: 256 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [resizeCorner, setResizeCorner] = React.useState('');
  const [isCropped, setIsCropped] = React.useState(false);
  const [isCropping, setIsCropping] = React.useState(false);
  const [filename, setFilename] = React.useState('');
  const [isVideoUploaded, setIsVideoUploaded] = React.useState(false);
  const [nameOfUploadedVideo, setnameOfUploadedVideo] = React.useState(null);
  const [cropProgress, setCropProgress] = React.useState(0);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState(null);

  const boxRef = React.useRef(null);
  const videoRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    socket.on('cropping-progress', ({ progress }) => {
      setCropProgress(progress);
      if (progress === 100) {
        showNotification('Video cropped successfully!');
      }
    });
    return () => {
      socket.off("cropping-progress");
    };
  }, []);

  const showNotification = (message, isError = false) => {
    if (isError) {
      setError(message);
      setTimeout(() => setError(null), 3000);
    } else {
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 right-4 bg-zinc-800 text-white px-4 py-2 rounded-lg shadow-lg transform transition-all duration-300';
      notification.textContent = message;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, 2700);
    }
  };

  // ... keep existing code (handleMouseMove, handleMouseUp, getDimensions functions)
  const getDimensions = () => {
    if (videoRef.current) {
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      const displayWidth = videoRef.current.offsetWidth;
      const displayHeight = videoRef.current.offsetHeight;

      // Calculate scaling factors
      const scaleX = videoWidth / displayWidth;
      const scaleY = videoHeight / displayHeight;

      // Calculate dimensions relative to original video size
      const dimensions = {
        x: Math.round(position.x * scaleX),
        y: Math.round(position.y * scaleY),
        width: Math.round(size.width * scaleX),
        height: Math.round(size.height * scaleY)
      };
      return dimensions;
    }
  };
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };
  const handleMouseMove = (e) => {
    const containerRect = e.currentTarget.getBoundingClientRect();

    if (isDragging) {
      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;

      // Constrain the box within the video boundaries
      newX = Math.max(0, Math.min(newX, containerRect.width - size.width));
      newY = Math.max(0, Math.min(newY, containerRect.height - size.height));

      setPosition({ x: newX, y: newY });
    }

    if (isResizing) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      let newWidth = size.width;
      let newHeight = size.height;
      let newX = position.x;
      let newY = position.y;

      const minSize = 100; // Minimum size in pixels

      switch (resizeCorner) {
        case 'topLeft':
          newWidth = Math.max(minSize, size.width - deltaX);
          newHeight = Math.max(minSize, size.height - deltaY);
          newX = position.x + (size.width - newWidth);
          newY = position.y + (size.height - newHeight);
          break;
        case 'topRight':
          newWidth = Math.max(minSize, size.width + deltaX);
          newHeight = Math.max(minSize, size.height - deltaY);
          newY = position.y + (size.height - newHeight);
          break;
        case 'bottomLeft':
          newWidth = Math.max(minSize, size.width - deltaX);
          newHeight = Math.max(minSize, size.height + deltaY);
          newX = position.x + (size.width - newWidth);
          break;
        case 'bottomRight':
          newWidth = Math.max(minSize, size.width + deltaX);
          newHeight = Math.max(minSize, size.height + deltaY);
          break;
      }

      // Constrain within video boundaries
      if (newX >= 0 && newX + newWidth <= containerRect.width &&
        newY >= 0 && newY + newHeight <= containerRect.height) {
        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    }
  };
  const handleMouseDown = (e, type, corner = '') => {
    e.stopPropagation();
    if (type === 'drag') {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    } else if (type === 'resize') {
      setIsResizing(true);
      setResizeCorner(corner);
      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      handleFileUpload(file);
    } else {
      showNotification('Please upload a valid video file', true);
    }
  };

  const handleFileUpload = (file) => {
    socket.connect();
    setFilename(file.name);
    const formData = new FormData();
    formData.append("video", file);

    showNotification('Uploading video...');

    fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(({ error, filename }) => {
        if (!error) {
          setIsVideoUploaded(true);
          setnameOfUploadedVideo(filename);
          showNotification('Video uploaded successfully!');
        } else {
          throw new Error('Upload failed');
        }
      })
      .catch(() => {
        showNotification('Failed to upload video', true);
      });
  };

  const submitHandler = (e) => {
    e.preventDefault();
    const input = e.target;
    const file = (input[0]).files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const CropTheVideo = () => {
    if (!nameOfUploadedVideo) return;

    setIsCropping(true);
    showNotification('Cropping video...');

    fetch('http://localhost:3000/api/crop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename: nameOfUploadedVideo, dimensions: getDimensions(), socketId: socket.id })
    })
      .then(res => res.json())
      .then(({ error }) => {
        if (!error) {
          setIsCropped(true);
          showNotification('Video processed successfully!');
        } else {
          throw new Error('Cropping failed');
        }
      })
      .catch(() => {
        showNotification('Failed to process video', true);
      });
  };

  // ... keep existing code (rest of the JSX remains the same, removing shadcn references)

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Video Cropper</h1>
          <p className="text-zinc-400 text-lg">Upload your video and crop it to your desired dimensions</p>
        </motion.div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {isCropping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white">Processing video</span>
              <span className="text-white">{cropProgress}%</span>
            </div>
            <Progress value={cropProgress} />
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!isVideoUploaded ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              <form
                onSubmit={submitHandler}
                className="flex flex-col items-center"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <motion.div
                  animate={{
                    scale: dragOver ? 1.02 : 1,
                    borderColor: dragOver ? 'rgb(255, 255, 255)' : 'rgb(63, 63, 70)'
                  }}
                  className="w-full max-w-2xl h-64 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center p-6 bg-zinc-900/50 backdrop-blur-sm transition-colors cursor-pointer hover:border-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 text-zinc-500 mb-4" />
                  <p className="text-zinc-300 text-lg mb-2">Drag and drop your video here</p>
                  <p className="text-zinc-500">or click to browse</p>
                </motion.div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative rounded-xl overflow-hidden bg-zinc-900/50 backdrop-blur-sm p-4"
            >
              <div
                className="relative"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <video
                  ref={videoRef}
                  controls
                  className="w-full rounded-lg"
                >
                  <source src={`/uploads/${nameOfUploadedVideo}`} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>

                <div
                  ref={boxRef}
                  className="border-2 border-white absolute cursor-move"
                  style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: `${size.width}px`,
                    height: `${size.height}px`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, 'drag')}
                >
                  <Corner
                    position={{ top: -2, left: -2 }}
                    cursor="nw-resize"
                    corner="topLeft"
                    onMouseDown={handleMouseDown}
                  />
                  <Corner
                    position={{ top: -2, right: -2 }}
                    cursor="ne-resize"
                    corner="topRight"
                    onMouseDown={handleMouseDown}
                  />
                  <Corner
                    position={{ bottom: -2, left: -2 }}
                    cursor="sw-resize"
                    corner="bottomLeft"
                    onMouseDown={handleMouseDown}
                  />
                  <Corner
                    position={{ bottom: -2, right: -2 }}
                    cursor="se-resize"
                    corner="bottomRight"
                    onMouseDown={handleMouseDown}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-6 px-8 py-3 bg-white text-black rounded-lg font-medium flex items-center justify-center gap-2 w-full sm:w-auto mx-auto"
                onClick={CropTheVideo}
                disabled={isCropping}
              >
                <Crop className="w-5 h-5" />
                {isCropping ? 'Processing...' : 'Crop Video'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {isCropped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 p-6 bg-zinc-900/50 backdrop-blur-sm rounded-xl"
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Check className="w-6 h-6 text-green-500" />
              Cropped Video
            </h2>
            <video
              controls
              className="w-full rounded-lg"
            >
              <source src={`/crops/${nameOfUploadedVideo}`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </motion.div>
        )}
      </div>
    </div>
  );
}
const Corner = ({ position, cursor, corner, onMouseDown }) => (
  <motion.div
    whileHover={{ scale: 1.2 }}
    className="absolute w-4 h-4 border-2 border-white bg-black/50 rounded-full"
    style={{ ...position, cursor }}
    onMouseDown={(e) => onMouseDown(e, 'resize', corner)}
  />
);