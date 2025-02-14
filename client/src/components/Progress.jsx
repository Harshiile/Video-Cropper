import React from 'react';

export const Progress = ({ value, className = '' }) => {
    return (
        <div className={`h-4 w-full bg-zinc-800 rounded-full overflow-hidden ${className}`}>
            <div
                className="h-full bg-white transition-all duration-300 ease-out"
                style={{ width: `${value}%` }}
            />
        </div>
    );
};