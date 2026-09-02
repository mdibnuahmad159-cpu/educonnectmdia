"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Sparkles, Loader2, Download, FileText } from "lucide-react";
import { adminAssistantChat } from "@/ai/flows/admin-assistant-flow";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

type Message = {
    role: 'user' | 'ai';
    text: string;
    image?: string;
    pdf?: {
        title: string;
        content: string;
        filename: string;
    };
};

export function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', text: 'Halo Admin! Ada yang bisa saya bantu? Saya bisa mencari data, membuat draf pengumuman, gambar, atau dokumen PDF.' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto scroll ke bawah setiap ada pesan baru
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

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            // Susun history untuk AI
            const history = messages.slice(-6).map(m => ({
                role: m.role === 'user' ? 'user' as const : 'model' as const,
                content: [{ text: m.text }]
            }));

            const result = await adminAssistantChat({ message: userMsg, history });
            
            setMessages(prev => [...prev, { 
                role: 'ai', 
                text: result.text || "Permintaan Anda telah saya proses.",
                image: result.generatedImage,
                pdf: result.generatedPdf
            }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'ai', text: 'Maaf, terjadi gangguan koneksi. Harap coba lagi.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const generateAndDownloadPdf = (pdfData: { title: string, content: string, filename: string }) => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text(pdfData.title, 105, 20, { align: 'center' });
            doc.setLineWidth(0.5);
            doc.line(20, 25, 190, 25);
            doc.setFontSize(11);
            const splitText = doc.splitTextToSize(pdfData.content, 170);
            doc.text(splitText, 20, 35);
            doc.setFontSize(8);
            doc.text(`Dibuat oleh AI Assistant - ${new Date().toLocaleDateString('id-ID')}`, 105, 285, { align: 'center' });
            doc.save(`${pdfData.filename.replace(/\.pdf$/i, '')}.pdf`);
        } catch (e) {
            console.error("PDF Fail:", e);
        }
    };

    if (!isOpen) {
        return (
            <Button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-6 h-12 w-12 rounded-full shadow-2xl z-50 animate-bounce hover:animate-none bg-primary text-primary-foreground"
            >
                <Sparkles className="h-6 w-6" />
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-20 right-6 w-[320px] sm:w-[400px] h-[500px] shadow-2xl z-50 flex flex-col border-primary/20 animate-in slide-in-from-bottom-5">
            <CardHeader className="p-3 border-b bg-primary text-primary-foreground rounded-t-lg flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                    <Bot className="h-4 w-4" /> ASISTEN ADMIN
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden bg-muted/5">
                <ScrollArea className="h-full p-4" ref={scrollRef}>
                    <div className="space-y-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={cn(
                                "flex gap-2 max-w-[85%]",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}>
                                <div className={cn(
                                    "p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm",
                                    msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-white border rounded-tl-none"
                                )}>
                                    <div className="whitespace-pre-wrap">{msg.text}</div>
                                    
                                    {msg.image && (
                                        <div className="mt-3 space-y-2">
                                            <div className="rounded-md overflow-hidden border">
                                                <img src={msg.image} alt="AI" className="w-full h-auto" />
                                            </div>
                                            <Button variant="outline" size="xs" className="w-full h-7 text-[9px] gap-1" asChild>
                                                <a href={msg.image} download="ai-result.png"><Download className="h-3 w-3" /> Simpan Gambar</a>
                                            </Button>
                                        </div>
                                    )}

                                    {msg.pdf && (
                                        <div className="mt-3 p-2 bg-muted/50 rounded-lg border border-dashed border-primary/30">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileText className="h-3.5 w-3.5 text-primary" />
                                                <span className="font-bold text-[9px] truncate">{msg.pdf.title}</span>
                                            </div>
                                            <Button 
                                                variant="default" 
                                                size="xs" 
                                                className="w-full h-7 text-[9px] gap-1"
                                                onClick={() => msg.pdf && generateAndDownloadPdf(msg.pdf)}
                                            >
                                                <Download className="h-3 w-3" /> Unduh PDF
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-2 mr-auto">
                                <div className="bg-white border p-3 rounded-2xl rounded-tl-none shadow-sm">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="p-3 border-t bg-white">
                <form className="flex w-full gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                    <Input 
                        placeholder="Tanyakan sesuatu..." 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="h-9 text-xs"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}
