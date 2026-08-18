import { makeImgIcon } from "@/components/elements/brand/vendor-img-icon";

// plain, not invertDark: the mark is gold on transparent, so graying it out
// would throw away the only colour it has.
const SlaiIcon = makeImgIcon("/icons/vendors/slai.webp", "SL-AI");

export default SlaiIcon;
