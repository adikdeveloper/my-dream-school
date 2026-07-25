import React from 'react';

const Settings = () => {
  return (
    <div className="settings">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="settings-grid">
        <div className="settings-section card">
          <h2 className="section-title">School Information</h2>
          <div className="setting-item">
            <label className="setting-label">School Name</label>
            <input type="text" className="setting-input" defaultValue="My Dream School" />
          </div>
          <div className="setting-item">
            <label className="setting-label">Address</label>
            <textarea className="setting-textarea" defaultValue="123 Education Street, Learning City, LC 12345" />
          </div>
          <div className="setting-item">
            <label className="setting-label">Phone Number</label>
            <input type="tel" className="setting-input" defaultValue="+1 (555) 123-4567" />
          </div>
          <div className="setting-item">
            <label className="setting-label">Email</label>
            <input type="email" className="setting-input" defaultValue="info@mydreamschool.edu" />
          </div>
        </div>

        <div className="settings-section card">
          <h2 className="section-title">Academic Settings</h2>
          <div className="setting-item">
            <label className="setting-label">Current Academic Year</label>
            <select className="setting-select">
              <option value="2023-2024">2023-2024</option>
              <option value="2024-2025">2024-2025</option>
            </select>
          </div>
          <div className="setting-item">
            <label className="setting-label">Grading Scale</label>
            <select className="setting-select">
              <option value="percentage">Percentage (0-100)</option>
              <option value="letter">Letter Grades (A-F)</option>
              <option value="gpa">GPA (0-4.0)</option>
            </select>
          </div>
          <div className="setting-item">
            <label className="setting-label">School Hours</label>
            <div className="time-inputs">
              <input type="time" className="setting-input" defaultValue="08:00" />
              <span>to</span>
              <input type="time" className="setting-input" defaultValue="15:30" />
            </div>
          </div>
        </div>

        <div className="settings-section card">
          <h2 className="section-title">System Preferences</h2>
          <div className="setting-item">
            <label className="setting-checkbox">
              <input type="checkbox" defaultChecked />
              <span>Enable email notifications</span>
            </label>
          </div>
          <div className="setting-item">
            <label className="setting-checkbox">
              <input type="checkbox" defaultChecked />
              <span>Auto-backup data daily</span>
            </label>
          </div>
          <div className="setting-item">
            <label className="setting-checkbox">
              <input type="checkbox" />
              <span>Allow student self-registration</span>
            </label>
          </div>
          <div className="setting-item">
            <label className="setting-checkbox">
              <input type="checkbox" defaultChecked />
              <span>Require parent approval for grades</span>
            </label>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-outline">Reset to Defaults</button>
        <button className="btn btn-primary">Save Changes</button>
      </div>

      <style jsx="true">{`
        .settings {
          padding: 2rem;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary-blue);
        }

        .settings-grid {
          display: grid;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .settings-section {
          padding: 2rem;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--primary-blue);
          margin-bottom: 1.5rem;
        }

        .setting-item {
          margin-bottom: 1.5rem;
        }

        .setting-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: var(--dark-gray);
        }

        .setting-input,
        .setting-select,
        .setting-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
        }

        .setting-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .setting-input:focus,
        .setting-select:focus,
        .setting-textarea:focus {
          outline: none;
          border-color: var(--primary-blue);
        }

        .time-inputs {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .time-inputs .setting-input {
          flex: 1;
        }

        .setting-checkbox {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          font-weight: 500;
          color: var(--dark-gray);
        }

        .setting-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--primary-blue);
        }

        .settings-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
        }

        @media (max-width: 768px) {
          .settings {
            padding: 1rem;
          }

          .settings-actions {
            flex-direction: column;
          }

          .time-inputs {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;