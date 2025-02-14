import React, { useEffect } from 'react';
import { socket } from './socket'

export default function VideoCropper() {
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [size, setSize] = React.useState({ width: 208, height: 256 }); // w-52 = 208px, h-64 = 256px
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

  useEffect(() => {
    socket.on('cropping-progress', ({ progress }) => {
      setCropProgress(progress)
    })
    return () => {
      socket.off("cropping-progress");
    };
  }, [])


  const boxRef = React.useRef(null);
  const videoRef = React.useRef(null);


  useEffect(() => {

  }, [])


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

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

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
  const Corner = ({ position, cursor, corner }) => (
    <div
      className={`absolute w-4 h-4 border-2 border-white cursor-${cursor} z-10`}
      style={{ ...position }}
      onMouseDown={(e) => handleMouseDown(e, 'resize', corner)}
    />
  );
  const CropTheVideo = () => {
    setIsCropping(true)
    fetch('http://localhost:3000/api/crop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename: nameOfUploadedVideo, dimensions: getDimensions(), socketId: socket.id })
    }).then(res => res.json()).then(({ error }) => {
      if (!error) {
        setIsCropped(true)
      }
    })
  }

  const submitHandler = (e) => {
    e.preventDefault()
    socket.connect()
    const video = e.target[0].files[0]
    setFilename(video.name)
    const formData = new FormData();
    formData.append("video", video);

    fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    }).then(res => res.json()).then(({ error, filename }) => {
      if (!error) {
        console.log(error, filename);
        setIsVideoUploaded(true)
        setnameOfUploadedVideo(filename)
      }
    })
  }
  return (
    <div className="min-h-screen min-w-screen bg-black flex flex-col justify-center items-center">
      {
        isCropping &&
        <p className='text-3xl text-white mb-12'>Cropping : {cropProgress}%</p>
      }
      <form encType="multipart/form-data"
        onSubmit={submitHandler}>
        {
          !isVideoUploaded &&
          <input
            type="file"
            name='video'
            accept="image/*,video/*"
            className="border border-white text-white p-2 rounded-md cursor-pointer"
          />
        }
        <div
          className="relative"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {
            isVideoUploaded &&
            <>
              <video
                ref={videoRef}
                controls
                width="1000"
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
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                }}
                onMouseDown={(e) => handleMouseDown(e, 'drag')}
              >
                {/* Resize handles */}
                <Corner position={{ top: -2, left: -2 }} cursor="nw-resize" corner="topLeft" />
                <Corner position={{ top: -2, right: -2 }} cursor="ne-resize" corner="topRight" />
                <Corner position={{ bottom: -2, left: -2 }} cursor="sw-resize" corner="bottomLeft" />
                <Corner position={{ bottom: -2, right: -2 }} cursor="se-resize" corner="bottomRight" />
              </div>
            </>
          }
        </div>

        {
          !isVideoUploaded &&
          <input
            type='submit'
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
            value='Upload'
          />
        }
      </form>

      {
        isVideoUploaded &&
        <button
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
          onClick={CropTheVideo}
        >CROP</button>
      }
      {
        isCropped &&
        <video
          ref={videoRef}
          controls
          width={'auto'}
          className='mt-32'
        >
          <source src={`/crops/${nameOfUploadedVideo}`} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      }
    </div>
  );
}