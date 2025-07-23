import React from 'react';

interface SyntaxHighlightProps {
  code: string;
  language?: string;
  className?: string;
}

/**
 * Simple syntax highlighting component
 * For production use, consider using a library like Prism.js or highlight.js
 */
export const SyntaxHighlight: React.FC<SyntaxHighlightProps> = ({
  code,
  language,
  className = ''
}) => {
  const getLanguageFromFilePath = (filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'sh':
      case 'bash':
        return 'bash';
      case 'sql':
        return 'sql';
      case 'yaml':
      case 'yml':
        return 'yaml';
      default:
        return 'text';
    }
  };

  const highlightSyntax = (text: string, lang: string): string => {
    // Simple regex-based highlighting - for production, use a proper syntax highlighter
    let highlighted = text;
    
    switch (lang) {
      case 'javascript':
      case 'typescript':
        // Keywords
        highlighted = highlighted.replace(
          /\b(const|let|var|function|class|import|export|from|if|else|for|while|return|try|catch|finally|async|await|new|this|typeof|instanceof)\b/g,
          '<span class="text-purple-600 font-semibold">$1</span>'
        );
        // Strings
        highlighted = highlighted.replace(
          /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g,
          '<span class="text-green-600">$1$2$1</span>'
        );
        // Comments
        highlighted = highlighted.replace(
          /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
          '<span class="text-gray-500 italic">$1</span>'
        );
        break;
        
      case 'python':
        // Keywords
        highlighted = highlighted.replace(
          /\b(def|class|import|from|if|elif|else|for|while|return|try|except|finally|with|as|pass|break|continue|and|or|not|in|is|lambda|None|True|False)\b/g,
          '<span class="text-purple-600 font-semibold">$1</span>'
        );
        // Strings
        highlighted = highlighted.replace(
          /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g,
          '<span class="text-green-600">$1$2$1</span>'
        );
        // Comments
        highlighted = highlighted.replace(
          /(#.*$)/gm,
          '<span class="text-gray-500 italic">$1</span>'
        );
        break;
        
      case 'css':
        // Properties
        highlighted = highlighted.replace(
          /([a-z-]+)\s*:/g,
          '<span class="text-blue-600">$1</span>:'
        );
        // Values
        highlighted = highlighted.replace(
          /:\s*([^;{\n]+)/g,
          ': <span class="text-green-600">$1</span>'
        );
        // Comments
        highlighted = highlighted.replace(
          /(\/\*[\s\S]*?\*\/)/g,
          '<span class="text-gray-500 italic">$1</span>'
        );
        break;
        
      case 'html':
        // Tags
        highlighted = highlighted.replace(
          /(<\/?[a-zA-Z][^>]*>)/g,
          '<span class="text-blue-600">$1</span>'
        );
        // Attributes
        highlighted = highlighted.replace(
          /(\s[a-zA-Z-]+)=/g,
          '<span class="text-red-600">$1</span>='
        );
        break;
        
      case 'json':
        // Keys
        highlighted = highlighted.replace(
          /"([^"]+)":/g,
          '<span class="text-blue-600">"$1"</span>:'
        );
        // String values
        highlighted = highlighted.replace(
          /:\s*"([^"]+)"/g,
          ': <span class="text-green-600">"$1"</span>'
        );
        // Numbers, booleans, null
        highlighted = highlighted.replace(
          /:\s*(true|false|null|\d+(?:\.\d+)?)/g,
          ': <span class="text-purple-600">$1</span>'
        );
        break;
        
      case 'bash':
        // Commands and flags
        highlighted = highlighted.replace(
          /\b(ls|cd|mkdir|rm|cp|mv|grep|find|sed|awk|cat|head|tail|sort|uniq|wc|ps|kill|top|curl|wget|git|npm|yarn|docker|kubectl)\b/g,
          '<span class="text-blue-600 font-semibold">$1</span>'
        );
        // Flags
        highlighted = highlighted.replace(
          /(\s)(-[a-zA-Z]+)/g,
          '$1<span class="text-purple-600">$2</span>'
        );
        // Strings
        highlighted = highlighted.replace(
          /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g,
          '<span class="text-green-600">$1$2$1</span>'
        );
        // Comments
        highlighted = highlighted.replace(
          /(#.*$)/gm,
          '<span class="text-gray-500 italic">$1</span>'
        );
        break;
    }
    
    return highlighted;
  };

  const detectedLanguage = language || getLanguageFromFilePath(code);
  const highlightedCode = highlightSyntax(code, detectedLanguage);

  return (
    <pre className={`font-mono text-sm overflow-x-auto ${className}`}>
      <code 
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
    </pre>
  );
};