import { MetaConnectionStatus } from "./MetaConnectionStatus";
import { MetaAccountsList } from "./MetaAccountsList";
import { MetaSyncStatus } from "./MetaSyncStatus";

export const MetaAdsIntegrationView = () => {
  return (
    <div className="space-y-6">
      <MetaConnectionStatus />
      <MetaAccountsList />
      <MetaSyncStatus />
    </div>
  );
};
