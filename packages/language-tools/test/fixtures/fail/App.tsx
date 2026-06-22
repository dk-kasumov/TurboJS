import Header from "./Header";

export const missing = <Header />;
export const wrongType = <Header title={123} />;
export const unknown = <Header title="ok" bogus="y" />;
