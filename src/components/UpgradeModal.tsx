import { createCheckoutSession } from '../utils/stripe';
import { useUser } from '@clerk/clerk-react';
import './UpgradeModal.css';

interface UpgradeModalProps {
  onClose: () => void;
  remainingEntries: number;
}

function UpgradeModal({ onClose, remainingEntries }: UpgradeModalProps) {
  const { user } = useUser();

  const handleUpgrade = async () => {
    await createCheckoutSession(user?.primaryEmailAddress?.emailAddress);
  };

  return (
    <div className="upgrade-modal-overlay" onClick={onClose}>
      <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="upgrade-icon">🎯</div>
        <h2>Upgrade to Premium</h2>
        
        <p className="upgrade-message">
          Get unlimited journal entries and access to all premium features!
        </p>

        <div className="pricing-card">
          <div className="price-header">
            <h3>Premium</h3>
            <div className="price">
              <span className="currency">$</span>
              <span className="amount">9</span>
              <span className="period">.99/mo</span>
            </div>
          </div>
          
          <ul className="features-list">
            <li>✨ <strong>Unlimited</strong> journal entries</li>
            <li>🎭 Access to <strong>all AI personalities</strong></li>
            <li>🎨 <strong>Create custom personas</strong></li>
            <li>💬 <strong>Conversation mode</strong> for deeper insights</li>
            <li>📊 <strong>Advanced analytics</strong> & psychological markers</li>
            <li>📈 <strong>Monthly insight reports</strong></li>
            <li>⚡ <strong>Priority processing</strong></li>
            <li>💾 <strong>Export your data</strong> anytime</li>
          </ul>

          <button className="upgrade-button" onClick={handleUpgrade}>
            Upgrade to Premium
          </button>
          
          <p className="upgrade-footer">
            Cancel anytime • Secure payment via Stripe
          </p>
        </div>

        <button className="continue-free-button" onClick={onClose}>
          {remainingEntries > 0 ? `Continue with ${remainingEntries} free ${remainingEntries === 1 ? 'entry' : 'entries'}` : 'Maybe later'}
        </button>
      </div>
    </div>
  );
}

export default UpgradeModal;
