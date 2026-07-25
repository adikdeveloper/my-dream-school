import React from 'react';
import './LoadingOverlay.css';

const LoadingOverlay = ({ message = "Ma'lumotlar yuklanmoqda", subMessage = "Iltimos kuting..." }) => {
    return (
        <div className="loading-overlay">
            <div className="loading-container">
                <div className="loading-card">
                    <div className="loading-logo">
                        <div className="logo-circle">
                            <div className="logo-inner"></div>
                        </div>
                        <div className="loading-rings">
                            <div className="ring ring-1"></div>
                            <div className="ring ring-2"></div>
                            <div className="ring ring-3"></div>
                        </div>
                    </div>
                    <div className="loading-text">
                        <h3>{message}</h3>
                        <p>{subMessage}</p>
                    </div>
                    <div className="loading-progress">
                        <div className="loading-progress-bar"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingOverlay;
