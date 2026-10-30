export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          storage_path: string;
          file_hash: string;
          total_pages: number;
          status: 'uploaded' | 'processing' | 'completed' | 'failed';
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          storage_path: string;
          file_hash: string;
          total_pages?: number;
          status?: 'uploaded' | 'processing' | 'completed' | 'failed';
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          storage_path?: string;
          file_hash?: string;
          total_pages?: number;
          status?: 'uploaded' | 'processing' | 'completed' | 'failed';
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      book_chunks: {
        Row: {
          id: string;
          book_id: string;
          content: string;
          chunk_index: number;
          pdf_page_index: number;
          printed_page_number: string | null;
          embedding: number[] | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          content: string;
          chunk_index: number;
          pdf_page_index: number;
          printed_page_number?: string | null;
          embedding?: number[] | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          content?: string;
          chunk_index?: number;
          pdf_page_index?: number;
          printed_page_number?: string | null;
          embedding?: number[] | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'book_chunks_book_id_fkey';
            columns: ['book_id'];
            isOneToOne: false;
            referencedRelation: 'books';
            referencedColumns: ['id'];
          }
        ];
      };
      book_figures: {
        Row: {
          id: string;
          book_id: string;
          pdf_page_index: number;
          printed_page_number: string | null;
          figure_label: string | null;
          caption: string | null;
          description: string | null;
          storage_path: string;
          embedding: number[] | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          pdf_page_index: number;
          printed_page_number?: string | null;
          figure_label?: string | null;
          caption?: string | null;
          description?: string | null;
          storage_path: string;
          embedding?: number[] | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          pdf_page_index?: number;
          printed_page_number?: string | null;
          figure_label?: string | null;
          caption?: string | null;
          description?: string | null;
          storage_path?: string;
          embedding?: number[] | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'book_figures_book_id_fkey';
            columns: ['book_id'];
            isOneToOne: false;
            referencedRelation: 'books';
            referencedColumns: ['id'];
          }
        ];
      };
      book_flashcards: {
        Row: {
          id: string;
          book_id: string;
          question: string;
          answer: string;
          figure_id: string | null;
          source_chunk_ids: string[];
          citations: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          question: string;
          answer: string;
          figure_id?: string | null;
          source_chunk_ids?: string[];
          citations?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          question?: string;
          answer?: string;
          figure_id?: string | null;
          source_chunk_ids?: string[];
          citations?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'book_flashcards_book_id_fkey';
            columns: ['book_id'];
            isOneToOne: false;
            referencedRelation: 'books';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'book_flashcards_figure_id_fkey';
            columns: ['figure_id'];
            isOneToOne: false;
            referencedRelation: 'book_figures';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Functions: {
      match_book_chunks_vector: {
        Args: {
          p_book_id: string;
          p_query_embedding: number[];
          p_match_count?: number;
          p_similarity_threshold?: number;
        };
        Returns: {
          id: string;
          book_id: string;
          content: string;
          chunk_index: number;
          pdf_page_index: number;
          printed_page_number: string | null;
          similarity: number;
          metadata: Json;
        }[];
      };
      match_book_chunks_text: {
        Args: {
          p_book_id: string;
          p_query_text: string;
          p_match_count?: number;
        };
        Returns: {
          id: string;
          book_id: string;
          content: string;
          chunk_index: number;
          pdf_page_index: number;
          printed_page_number: string | null;
          rank: number;
          metadata: Json;
        }[];
      };
      match_book_chunks_hybrid: {
        Args: {
          p_book_id: string;
          p_query_embedding: number[];
          p_query_text: string;
          p_match_count?: number;
          p_rrf_k?: number;
        };
        Returns: {
          id: string;
          book_id: string;
          content: string;
          chunk_index: number;
          pdf_page_index: number;
          printed_page_number: string | null;
          dense_rank: number;
          sparse_rank: number;
          rrf_score: number;
          metadata: Json;
        }[];
      };
      match_book_figures: {
        Args: {
          p_book_id: string;
          p_query_embedding: number[];
          p_match_count?: number;
          p_similarity_threshold?: number;
        };
        Returns: {
          id: string;
          book_id: string;
          pdf_page_index: number;
          printed_page_number: string | null;
          figure_label: string | null;
          caption: string | null;
          description: string | null;
          storage_path: string;
          similarity: number;
          metadata: Json;
        }[];
      };
    };
  };
}

