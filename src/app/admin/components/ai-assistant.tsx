"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Sparkles, Download, FileText } from "lucide-react";
import { adminAssistantChat } from "@/ai/flows/admin-assistant-flow";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

type Message = {
    role: 'user' | 'ai';
    text: string;
    pdf?: {
        title: string;
        content: string;
        filename: string;
    };
    error?: boolean;
};

export function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', text: 'Halo Admin! Ada yang bisa saya bantu terkait administrasi Madrasah? Saya bisa membantu menjawab pertanyaan atau membuatkan draf surat dalam format PDF.' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages, isOpen, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            // Mengambil 6 pesan terakhir untuk konteks history agar tidak kelebihan token
            const history = messages.slice(-6).map(m => ({
                role: m.role === 'user' ? 'user' as const : 'model' as const,
                content: [{ text: m.text }]
            }));

            const result = await adminAssistantChat({ message: userMsg, history });
            
            const aiMsg: Message = { 
                role: 'ai', 
                text: result.text || "Permintaan Anda telah saya proses.",
                pdf: result.generatedPdf,
            };
            
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Assistant Client Error:", error);
            setMessages(prev => [...prev, { 
                role: 'ai', 
                text: 'Maaf, terjadi gangguan koneksi sementara ke server AI. Mohon pastikan koneksi internet Anda stabil dan coba lagi.',
                error: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const generateAndDownloadPdf = (pdfData: { title: string, content: string, filename: string }) => {
        try {
            const doc = new jsPDF();
            
            // Header
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text(pdfData.title.toUpperCase(), 105, 25, { align: 'center' });
            doc.setLineWidth(0.5);
            doc.line(20, 30, 190, 30);
            
            // Content
            doc.setFont("times", "normal");
            doc.setFontSize(12);
            const splitText = doc.splitTextToSize(pdfData.content, 170);
            doc.text(splitText, 20, 45, { align: 'justify' });
            
            // Footer
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Dihasilkan secara otomatis oleh EduConnect AI Assistant - ${new Date().toLocaleDateString('id-ID')}`, 105, 285, { align: 'center' });
            
            doc.save(`${pdfData.filename || 'dokumen_madrasah'}.pdf`);
        } catch (e) {
            console.error("PDF Generation Fail:", e);
        }
    };

    if (!isOpen) {
        return (
            <Button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-6 h-12 w-12 rounded-full shadow-2xl z-50 animate-bounce hover:animate-none bg-primary text-primary-foreground border-2 border-white/20"
            >
                <Sparkles className="h-6 w-6" />
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-20 right-6 w-[320px] sm:w-[450px] h-[500px] shadow-2xl z-50 flex flex-col border-primary/20 animate-in slide-in-from-bottom-5">
            <CardHeader className="p-3 border-b bg-primary text-primary-foreground rounded-t-lg flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                    <Bot className="h-4 w-4" /> Asisten Administrasi
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50">
                <ScrollArea className="h-full p-4" ref={scrollRef}>
                    <div className="space-y-4 pb-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={cn(
                                "flex gap-2 max-w-[85%]",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}>
                                <div className={cn(
                                    "p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm",
                                    msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-white border border-slate-200 rounded-tl-none",
                                    msg.error && "border-destructive/30 bg-destructive/5 text-destructive"
                                )}>
                                    <div className="whitespace-pre-wrap">{msg.text}</div>
                                    
                                    {msg.pdf && (
                                        <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-dashed border-primary/20 flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-primary/10 rounded-full">
                                                    <FileText className="h-3.5 w-3.5 text-primary" />
                                                </div>
                                                <span className="font-bold text-[10px] truncate flex-1 uppercase tracking-tight">{msg.pdf.title}</span>
                                            </div>
                                            <Button 
                                                variant="default" 
                                                size="sm" 
                                                className="w-full h-8 text-[10px] gap-2 font-bold shadow-sm"
                                                onClick={() => msg.pdf && generateAndDownloadPdf(msg.pdf)}
                                            >
                                                <Download className="h-3.5 w-3.5" /> UNDUH PDF
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-2 mr-auto">
                                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                                    <div className="flex gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="p-3 border-t bg-white">
                <form className="flex w-full gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                    <Input 
                        placeholder="Tanya info atau minta buatkan draf PDF..." 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="h-9 text-xs focus-visible:ring-primary/30"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" className="h-9 w-9 shrink-0 shadow-sm" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}
