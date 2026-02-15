import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BarChart3, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface MetaInsightDaily {
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  reach: number | null;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  conversions: number | null;
  conversion_values: number | null;
}

interface MetaAccountDrilldownProps {
  accountIds: string[];
  byAccount: Record<string, MetaInsightDaily[]>;
  campaigns: any[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
};

export const MetaAccountDrilldown = ({ accountIds, byAccount, campaigns }: MetaAccountDrilldownProps) => {
  // Fetch account details
  const { data: accounts } = useQuery({
    queryKey: ['meta-accounts-details', accountIds],
    queryFn: async () => {
      if (accountIds.length === 0) return [];
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('id, name, meta_account_id, business_name')
        .in('id', accountIds);
      if (error) throw error;
      return data || [];
    },
    enabled: accountIds.length > 0,
  });

  if (!accounts || accounts.length <= 1) {
    // Only show drilldown when there are multiple accounts
    // Show campaigns list instead
    if (campaigns.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5" />
            Campanhas ({campaigns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {campaigns.map((campaign: any) => (
              <div key={campaign.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                <div>
                  <p className="font-medium">{campaign.name}</p>
                  <p className="text-xs text-muted-foreground">{campaign.objective || 'Sem objetivo definido'}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    campaign.effective_status === 'ACTIVE'
                      ? 'bg-green-500/10 text-green-600'
                      : campaign.effective_status === 'PAUSED'
                        ? 'bg-yellow-500/10 text-yellow-600'
                        : 'bg-gray-500/10 text-gray-600'
                  }
                >
                  {campaign.effective_status === 'ACTIVE' ? 'Ativa' :
                    campaign.effective_status === 'PAUSED' ? 'Pausada' :
                      campaign.effective_status || 'Desconhecido'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5" />
          Detalhamento por Conta
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="space-y-2">
          {accounts.map((account) => {
            const insights = byAccount[account.id] || [];
            const totals = insights.reduce(
              (acc, i) => ({
                spend: acc.spend + (i.spend || 0),
                impressions: acc.impressions + (i.impressions || 0),
                clicks: acc.clicks + (i.clicks || 0),
                conversions: acc.conversions + (i.conversions || 0),
                conversion_values: acc.conversion_values + (i.conversion_values || 0),
              }),
              { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversion_values: 0 }
            );

            const accountCampaigns = campaigns.filter(c => c.ad_account_id === account.id);

            return (
              <AccordionItem key={account.id} value={account.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.meta_account_id}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {formatCurrency(totals.spend)}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {/* Metrics summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <p className="text-xs text-muted-foreground">Investimento</p>
                        <p className="font-semibold text-sm">{formatCurrency(totals.spend)}</p>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <p className="text-xs text-muted-foreground">Impressões</p>
                        <p className="font-semibold text-sm">{formatNumber(totals.impressions)}</p>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <p className="text-xs text-muted-foreground">Cliques</p>
                        <p className="font-semibold text-sm">{formatNumber(totals.clicks)}</p>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <p className="text-xs text-muted-foreground">Receita</p>
                        <p className="font-semibold text-sm">{formatCurrency(totals.conversion_values)}</p>
                      </div>
                    </div>

                    {/* Campaigns */}
                    {accountCampaigns.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Campanhas ({accountCampaigns.length})</p>
                        {accountCampaigns.map((campaign: any) => (
                          <div key={campaign.id} className="flex items-center justify-between p-2 bg-muted/20 rounded text-xs">
                            <span>{campaign.name}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${campaign.effective_status === 'ACTIVE'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-gray-500/10 text-gray-600'
                                }`}
                            >
                              {campaign.effective_status === 'ACTIVE' ? 'Ativa' : campaign.effective_status || '-'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
};
