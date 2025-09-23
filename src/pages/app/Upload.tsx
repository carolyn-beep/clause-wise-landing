import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Upload as UploadIcon, FileText, Sparkles, Loader2, X, File, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Upload = () => {
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzeImmediately, setAnalyzeImmediately] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Auto-save and load draft from localStorage
  useEffect(() => {
    // Load saved draft on component mount
    const savedTitle = localStorage.getItem('clausewise-draft-title');
    const savedText = localStorage.getItem('clausewise-draft-text');
    
    if (savedTitle) {
      setTitle(savedTitle);
    }
    if (savedText) {
      setSourceText(savedText);
    }
  }, []);

  // Auto-save title to localStorage
  useEffect(() => {
    localStorage.setItem('clausewise-draft-title', title);
  }, [title]);

  // Auto-save text to localStorage
  useEffect(() => {
    localStorage.setItem('clausewise-draft-text', sourceText);
  }, [sourceText]);

  // Clear draft after successful analysis
  const clearDraft = () => {
    localStorage.removeItem('clausewise-draft-title');
    localStorage.removeItem('clausewise-draft-text');
  };

  // File validation
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return 'Invalid file type. Only PDF, DOCX, and TXT files are allowed.';
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'File too large. Maximum size is 10MB.';
    }

    return null;
  };

  // Handle file upload and extraction
  const handleFileExtraction = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Invalid file",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get current session
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upload files.",
          variant: "destructive",
        });
        navigate("/sign-in");
        return;
      }

      setUploadProgress(30);

      // Create FormData with file, title, and analyzeNow
      const formData = new FormData();
      formData.append('file', file);
      if (title.trim()) {
        formData.append('title', title.trim());
      }
      formData.append('analyzeNow', analyzeImmediately.toString());

      setUploadProgress(60);

      // Call upload-extract edge function
      const { data, error } = await supabase.functions.invoke('upload-extract', {
        body: formData
      });

      if (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload failed",
          description: error.message || "Failed to extract text from file.",
          variant: "destructive",
        });
        return;
      }

      setUploadProgress(100);

      // Handle response based on analyzeNow flag
      if (analyzeImmediately && data.analysis_id && data.redirect_to) {
        // Navigate immediately to analysis results
        clearDraft();
        navigate(data.redirect_to);
        return;
      }

      // Fill textarea with extracted text
      setSourceText(data.source_text || '');
      
      // Set title to returned title or fallback to filename without extension
      const extractedTitle = data.title || file.name.replace(/\.[^/.]+$/, "");
      if (!title.trim()) {
        setTitle(extractedTitle);
      }

      // Show any notes from extraction
      const notes = data.notes || [];
      if (notes.length > 0) {
        toast({
          title: "Text extracted with notes",
          description: notes.join(', '),
          variant: "default",
        });
      } else {
        toast({
          title: "Text extracted successfully",
          description: `Extracted text from ${file.name}`,
        });
      }

    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Something went wrong",
        description: "An unexpected error occurred during file upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };


  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      handleFileExtraction(file);
    }
  }, []);

  // File input handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      handleFileExtraction(file);
    }
  };

  // Keyboard handler for drop zone
  const handleDropZoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceText.trim()) {
      toast({
        title: "Contract text required",
        description: "Please paste your contract text to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // Get the current session
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to analyze contracts.",
          variant: "destructive",
        });
        navigate("/sign-in");
        return;
      }

      // Call the analyze-contract edge function
      const { data, error } = await supabase.functions.invoke('analyze-contract', {
        body: {
          title: title.trim() || undefined,
          source_text: sourceText.trim()
        }
      });

      if (error) {
        console.error('Analysis error:', error);
        toast({
          title: "Analysis failed",
          description: error.message || "Failed to analyze contract. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Navigate to the report page with the analysis ID
      navigate(`/app/report/${data.analysis_id}`);
      
      // Clear the draft after successful analysis
      clearDraft();

    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Something went wrong",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sample contract text for development testing
  const sampleContractText = `FREELANCE WEB DEVELOPMENT AGREEMENT

This Agreement is entered into between ClauseWise Technologies Inc. ("Client") and Freelancer ("Developer") for web development services.

1. SCOPE OF WORK
Developer shall provide web development services as outlined in the project specification document attached hereto.

2. PAYMENT TERMS
Client agrees to pay Developer $5,000 for the completed work. Payment is due within 30 days of invoice. Late fees of 1.5% per month shall apply to overdue amounts.

3. INDEMNIFICATION
Developer agrees to indemnify and hold harmless Client from any and all claims, damages, losses, and expenses (including attorney's fees) arising out of or relating to Developer's performance under this Agreement, regardless of the cause of such claims.

4. LIMITATION OF LIABILITY
IN NO EVENT SHALL CLIENT'S LIABILITY TO DEVELOPER EXCEED THE TOTAL AMOUNT PAID UNDER THIS AGREEMENT. CLIENT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.

5. INTELLECTUAL PROPERTY OWNERSHIP
All work product, including but not limited to code, designs, concepts, and documentation created by Developer shall become the exclusive property of Client upon creation.

6. AUTO-RENEWAL
This agreement shall automatically renew for successive one-year terms unless either party provides 90 days written notice of non-renewal.

7. TERMINATION FOR CONVENIENCE
Client may terminate this agreement at any time for any reason or no reason with 5 days written notice to Developer.

8. GOVERNING LAW
This Agreement shall be governed by the laws of Delaware, and any disputes shall be resolved through binding arbitration in Delaware.

9. NON-COMPETE
Developer agrees not to work for any competing businesses in the web development industry for a period of 24 months following termination of this agreement.

10. WARRANTY DISCLAIMER
ALL SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.`;

  const handleQuickSeed = () => {
    setTitle("Sample Freelance Web Development Agreement");
    setSourceText(sampleContractText);
    toast({
      title: "Sample contract loaded",
      description: "Click 'Analyze Contract' to test the full flow.",
    });
  };
  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Contract Analysis
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload or paste your contract text to get instant AI-powered insights
          </p>
        </div>

        <Card className="shadow-medium border-0 bg-gradient-secondary">
          <CardContent className="p-8 md:p-12">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Ready to analyze your contract?
            </h2>
            
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed text-center">
              Upload a contract file or paste your contract text below. Our AI will analyze the document for potential risks, 
              payment terms, and important clauses you should be aware of.
            </p>

            {/* File Upload Area */}
            <div className="max-w-3xl mx-auto mb-8">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold mb-2">Upload Contract File</h3>
                <p className="text-sm text-muted-foreground">
                  Drag and drop a file or click to browse • PDF, DOCX, TXT • Max 10MB
                </p>
              </div>
              
              <div
                ref={dropZoneRef}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onKeyDown={handleDropZoneKeyDown}
                onClick={() => fileInputRef.current?.click()}
                tabIndex={0}
                role="button"
                aria-label="Upload contract file by dragging and dropping or clicking to browse"
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50
                  ${isDragOver 
                    ? 'border-primary bg-primary/5 scale-105' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                
                {isUploading ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Extracting text...</p>
                      <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                      <p className="text-xs text-muted-foreground">
                        {uploadProgress < 30 ? 'Uploading file...' :
                         uploadProgress < 60 ? 'Processing file...' :
                         uploadProgress < 100 ? 'Extracting text...' : 'Complete!'}
                      </p>
                    </div>
                  </div>
                ) : uploadedFile ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-green-800">{uploadedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(uploadedFile.size)} • Text extracted successfully
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                        }}
                        className="text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                      <UploadIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">Drop your contract file here</p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse files
                      </p>
                      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <File className="w-3 h-3" />
                          PDF
                        </span>
                        <span className="flex items-center gap-1">
                          <File className="w-3 h-3" />
                          DOCX
                        </span>
                        <span className="flex items-center gap-1">
                          <File className="w-3 h-3" />
                          TXT
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Analyze Immediately Checkbox */}
              {!isUploading && (
                <div className="flex items-center space-x-2 justify-center mt-4">
                  <Checkbox
                    id="analyze-immediately"
                    checked={analyzeImmediately}
                    onCheckedChange={(checked) => setAnalyzeImmediately(checked === true)}
                  />
                  <Label htmlFor="analyze-immediately" className="text-sm cursor-pointer">
                    Analyze immediately after extraction
                  </Label>
                </div>
              )}

              {/* OR Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or paste text</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
              <div className="space-y-2 text-left">
                <Label htmlFor="title">Contract Title (Optional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Freelance Web Development Agreement"
                  className="border-primary/20 focus:border-primary focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2 text-left">
                <Label htmlFor="contract-text">Contract Text *</Label>
                <Textarea
                  id="contract-text"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Paste your contract text here..."
                  className="min-h-[300px] border-primary/20 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              {/* Developer Quick Seed Button - Only in development */}
              {import.meta.env.DEV && (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleQuickSeed}
                    className="text-xs bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
                  >
                    🚀 Quick Seed (Dev Only)
                  </Button>
                </div>
              )}
              
              <div className="flex items-center justify-center">
                <Button 
                  type="submit" 
                  variant="hero" 
                  size="lg" 
                  className="px-8"
                  disabled={isAnalyzing || !sourceText.trim()}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze Contract
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Quick tips */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="p-4 border border-border/50 rounded-lg">
            <h3 className="font-semibold mb-2">✨ What we analyze</h3>
            <p className="text-sm text-muted-foreground">
              Payment terms, deadlines, liability clauses, and potential risks
            </p>
          </div>
          <div className="p-4 border border-border/50 rounded-lg">
            <h3 className="font-semibold mb-2">🔒 Your privacy</h3>
            <p className="text-sm text-muted-foreground">
              Your contracts are processed securely and never stored permanently
            </p>
          </div>
          <div className="p-4 border border-border/50 rounded-lg">
            <h3 className="font-semibold mb-2">⚡ Get results</h3>
            <p className="text-sm text-muted-foreground">
              Instant analysis with actionable insights and recommendations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;