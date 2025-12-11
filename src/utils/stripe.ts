// Stripe subscription utilities

const STRIPE_PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK;

export const FREE_ENTRY_LIMIT = 3;

/**
 * Get user-specific premium storage key
 */
function getPremiumStorageKey(userId?: string): string {
  return userId ? `mindpebbles_premium_${userId}` : 'mindpebbles_premium_guest';
}

/**
 * Check if user is a premium subscriber
 */
export function isPremiumUser(userId?: string): boolean {
  // Check localStorage for premium status
  const storageKey = getPremiumStorageKey(userId);
  const premiumStatus = localStorage.getItem(storageKey);
  if (premiumStatus) {
    const { isPremium, expiresAt } = JSON.parse(premiumStatus);
    if (isPremium && new Date(expiresAt) > new Date()) {
      return true;
    }
  }
  return false;
}

/**
 * Get remaining free entries for current user
 */
export function getRemainingFreeEntries(totalEntries: number, userId?: string): number {
  if (isPremiumUser(userId)) {
    return Infinity;
  }
  return Math.max(0, FREE_ENTRY_LIMIT - totalEntries);
}

/**
 * Check if user has reached their entry limit
 */
export function hasReachedLimit(totalEntries: number, userId?: string): boolean {
  if (isPremiumUser(userId)) {
    return false;
  }
  return totalEntries >= FREE_ENTRY_LIMIT;
}

/**
 * Create Stripe Checkout session and redirect to payment
 */
export async function createCheckoutSession(userEmail?: string): Promise<void> {
  console.log('Creating checkout session for:', userEmail);
  
  // Check if we have a real Stripe Payment Link
  if (STRIPE_PAYMENT_LINK && !STRIPE_PAYMENT_LINK.includes('your_')) {
    // Production mode: redirect to real Stripe checkout
    const paymentUrl = new URL(STRIPE_PAYMENT_LINK);
    
    // Add customer email as prefill if available
    if (userEmail) {
      paymentUrl.searchParams.set('prefilled_email', userEmail);
    }
    
    // Add success return URL to come back to the app
    const successUrl = `${window.location.origin}?payment=success`;
    paymentUrl.searchParams.set('success_url', successUrl);
    
    console.log('Redirecting to Stripe:', paymentUrl.toString());
    window.location.href = paymentUrl.toString();
  } else {
    // Demo mode: simulate payment with user confirmation
    const confirmed = confirm(
      '🎯 Demo Mode: Upgrade to Premium?\n\n' +
      'In production, this would redirect to Stripe Checkout.\n' +
      'For this demo, we\'ll activate premium immediately.\n\n' +
      'Click OK to activate Premium ($9.99/mo)'
    );
    
    if (confirmed) {
      // Simulate a brief loading period
      await new Promise(resolve => setTimeout(resolve, 500));
      
      activatePremium();
      
      alert('🎉 Premium Activated!\n\nYou now have unlimited journal entries and access to all features!');
      
      // Refresh to show premium status
      window.location.reload();
    }
  }
}

/**
 * Activate premium subscription (for demo/testing)
 */
export function activatePremium(userId?: string, months: number = 12): void {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);
  
  const storageKey = getPremiumStorageKey(userId);
  localStorage.setItem(storageKey, JSON.stringify({
    isPremium: true,
    activatedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  }));
}

/**
 * Deactivate premium subscription (for testing)
 */
export function deactivatePremium(userId?: string): void {
  const storageKey = getPremiumStorageKey(userId);
  localStorage.removeItem(storageKey);
  console.log('Premium deactivated for:', storageKey);
}

// Auto-check and clean up expired premium on load
(function checkExpiredPremium() {
  const premiumStatus = localStorage.getItem('mindpebbles_premium');
  if (premiumStatus) {
    const { isPremium, expiresAt } = JSON.parse(premiumStatus);
    if (isPremium && new Date(expiresAt) <= new Date()) {
      console.log('Premium subscription expired, cleaning up...');
      localStorage.removeItem('mindpebbles_premium');
    }
  }
})();

/**
 * Get subscription info for display
 */
export function getSubscriptionInfo(userId?: string): {
  isPremium: boolean;
  expiresAt?: string;
  daysRemaining?: number;
} {
  const storageKey = getPremiumStorageKey(userId);
  const premiumStatus = localStorage.getItem(storageKey);
  if (!premiumStatus) {
    return { isPremium: false };
  }
  
  const { isPremium, expiresAt } = JSON.parse(premiumStatus);
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    isPremium: isPremium && expiryDate > now,
    expiresAt,
    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
  };
}
