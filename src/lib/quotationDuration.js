const getNightCount = (entry) => {
  const nights = Number.parseInt(entry?.nights, 10);
  return Number.isFinite(nights) && nights > 0 ? nights : 0;
};

export const sumHotelNights = (hotelEntries = []) =>
  (Array.isArray(hotelEntries) ? hotelEntries : []).reduce(
    (total, entry) => total + getNightCount(entry),
    0,
  );

const getOptionHotelEntries = (option) =>
  Array.isArray(option?.hotelEntries) ? option.hotelEntries : [];

export const getPrimaryHotelEntries = ({
  packageOptions,
  hotelEntries,
} = {}) => {
  if (Array.isArray(packageOptions) && packageOptions.length > 0) {
    return getOptionHotelEntries(
      packageOptions.find((option) => getOptionHotelEntries(option).length > 0),
    );
  }

  return Array.isArray(hotelEntries) ? hotelEntries : [];
};

export const getQuotationDuration = ({
  packageOptions,
  hotelEntries,
} = {}) => {
  const optionEntries =
    Array.isArray(packageOptions) && packageOptions.length > 0
      ? packageOptions.map(getOptionHotelEntries)
      : [Array.isArray(hotelEntries) ? hotelEntries : []];

  const optionNights = optionEntries
    .map(sumHotelNights)
    .filter((nights) => nights > 0);

  if (!optionNights.length) {
    return {
      minNights: 0,
      maxNights: 0,
      minDays: 1,
      maxDays: 1,
      isRange: false,
      label: "0 Nights / 1 Day",
    };
  }

  const minNights = Math.min(...optionNights);
  const maxNights = Math.max(...optionNights);
  const minDays = minNights + 1;
  const maxDays = maxNights + 1;

  if (minNights === maxNights) {
    return {
      minNights,
      maxNights,
      minDays,
      maxDays,
      isRange: false,
      label: `${minNights} Nights / ${minDays} Days`,
    };
  }

  return {
    minNights,
    maxNights,
    minDays,
    maxDays,
    isRange: true,
    label: `${minNights}-${maxNights} Nights / ${minDays}-${maxDays} Days`,
  };
};
