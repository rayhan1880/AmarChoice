export interface CourierStatusDisplay {
  label: string;
  subLabel?: string;
  badgeClass: string;
  iconName: 'truck' | 'check' | 'x' | 'clock' | 'rotate' | 'alert' | 'package';
  category: 'delivered' | 'in_transit' | 'out_for_delivery' | 'cancelled' | 'returned' | 'pending' | 'hold';
}

export function getCourierStatusDisplay(
  rawStatus: string | undefined | null,
  lang: 'bn' | 'en' = 'bn'
): CourierStatusDisplay {
  const isBn = lang === 'bn';
  const s = (rawStatus || '').toLowerCase().trim();

  // Delivered
  if (s.includes('delivered') && !s.includes('pending') && !s.includes('partial')) {
    return {
      label: isBn ? 'সফল ডেলিভারি' : 'Delivered',
      subLabel: isBn ? 'গ্রাহক পণ্য গ্রহণ করেছেন' : 'Customer received parcel',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      iconName: 'check',
      category: 'delivered'
    };
  }

  // Partial Delivered
  if (s.includes('partial')) {
    return {
      label: isBn ? 'আংশিক ডেলিভারি' : 'Partial Delivered',
      subLabel: isBn ? 'কিছু পণ্য গ্রহণ করেছেন' : 'Partially received',
      badgeClass: 'bg-teal-50 text-teal-800 border-teal-300',
      iconName: 'check',
      category: 'delivered'
    };
  }

  // Out for Delivery
  if (s.includes('out for delivery') || s.includes('out_for_delivery')) {
    return {
      label: isBn ? 'ডেলিভারিতে বের হয়েছে' : 'Out for Delivery',
      subLabel: isBn ? 'রাইডার ডেলিভারি দিতে রওনা হয়েছে' : 'Rider is on the way',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
      iconName: 'truck',
      category: 'out_for_delivery'
    };
  }

  // In Transit / Dispatched
  if (s.includes('transit') || s.includes('dispatch') || s.includes('in_transit') || s.includes('shipping')) {
    return {
      label: isBn ? 'পথে আছে (ট্রানজিট)' : 'In Transit',
      subLabel: isBn ? 'কুরিয়ার হাব/গন্তব্যে পৌঁছাচ্ছে' : 'Moving between hubs',
      badgeClass: 'bg-blue-50 text-blue-900 border-blue-300',
      iconName: 'truck',
      category: 'in_transit'
    };
  }

  // Picked / Pickup
  if (s.includes('picked') || s.includes('pickup') || s.includes('received')) {
    return {
      label: isBn ? 'কুরিয়ার পিক করেছে' : 'Picked by Courier',
      subLabel: isBn ? 'পার্সেল কুরিয়ারের কাছে আছে' : 'Parcel in courier custody',
      badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-300',
      iconName: 'package',
      category: 'in_transit'
    };
  }

  // Cancelled
  if (s.includes('cancel') || s.includes('cancelled') || s.includes('rejected')) {
    return {
      label: isBn ? 'অর্ডার বাতিল' : 'Cancelled',
      subLabel: isBn ? 'কুরিয়ারে ডেলিভারি বাতিল হয়েছে' : 'Delivery cancelled',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
      iconName: 'x',
      category: 'cancelled'
    };
  }

  // Returned / Return Pending
  if (s.includes('return') || s.includes('failed')) {
    return {
      label: isBn ? 'পার্সেল রিটার্ন' : 'Returned',
      subLabel: isBn ? 'পার্সেল ফেরত পাঠানো হচ্ছে' : 'Returning to merchant',
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-300',
      iconName: 'rotate',
      category: 'returned'
    };
  }

  // Hold
  if (s.includes('hold') || s.includes('review')) {
    return {
      label: isBn ? 'হোল্ডে আছে' : 'On Hold',
      subLabel: isBn ? 'কুরিয়ার থেকে যোগাযোগ বাকি' : 'Pending clarification',
      badgeClass: 'bg-orange-50 text-orange-900 border-orange-300',
      iconName: 'alert',
      category: 'hold'
    };
  }

  // Pending
  if (s.includes('pending')) {
    return {
      label: isBn ? 'কুরিয়ারে প্রসেসিং' : 'Pending',
      subLabel: isBn ? 'রাইডার পিকআপের অপেক্ষায়' : 'Awaiting pickup',
      badgeClass: 'bg-stone-100 text-stone-800 border-stone-300',
      iconName: 'clock',
      category: 'pending'
    };
  }

  // Fallback for any other custom status
  return {
    label: rawStatus ? (isBn ? `স্ট্যাটাস: ${rawStatus}` : rawStatus) : (isBn ? 'তথ্য নেই' : 'No Data'),
    badgeClass: 'bg-stone-100 text-stone-800 border-stone-300',
    iconName: 'package',
    category: 'pending'
  };
}

export function getCourierProviderInfo(provider?: string) {
  const p = (provider || '').toLowerCase();
  if (p === 'steadfast') {
    return {
      name: 'Steadfast',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      color: '#0284c7',
      labelBn: 'স্টিডফাস্ট'
    };
  }
  if (p === 'pathao') {
    return {
      name: 'Pathao',
      badgeClass: 'bg-red-50 text-red-800 border-red-200',
      color: '#e11d48',
      labelBn: 'পাঠাও'
    };
  }
  return {
    name: provider || 'Courier',
    badgeClass: 'bg-stone-100 text-stone-800 border-stone-200',
    color: '#78716c',
    labelBn: 'কুরিয়ার'
  };
}
