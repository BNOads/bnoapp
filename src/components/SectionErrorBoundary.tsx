import { Component, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export class SectionErrorBoundary extends Component<
    { section: string; children: ReactNode },
    { hasError: boolean }
> {
    constructor(props: { section: string; children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error(`Erro ao renderizar seção "${this.props.section}":`, error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Erro ao carregar bloco</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            O bloco "{this.props.section}" falhou ao carregar.
                        </p>
                    </CardContent>
                </Card>
            );
        }

        return this.props.children;
    }
}
