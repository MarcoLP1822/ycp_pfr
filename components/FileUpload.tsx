// components/FileUpload.tsx
import React, { useState, ChangeEvent } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

// Definiamo le estensioni permesse
const allowedExtensions = ['doc', 'docx', 'odt', 'odf', 'txt']

const FileUpload: React.FC = () => {
  const supabase = useSupabaseClient()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadSuccess, setUploadSuccess] = useState<string>('')

  // Gestione selezione file
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('')
    setUploadSuccess('')
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        setErrorMessage('Invalid file type. Please upload a doc, docx, odt/odf, or txt file.')
        setSelectedFile(null)
        return
      }
      setSelectedFile(file)
    }
  }

  // Gestione upload su Supabase
  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file before uploading.')
      return
    }
    setUploading(true)
    setErrorMessage('')
    setUploadSuccess('')

    try {
      const fileName = `${Date.now()}-${selectedFile.name}`
      const bucketName = 'uploads' // Assicurati che il tuo bucket si chiami "uploads"

      const { data, error } = await supabase
        .storage
        .from(bucketName)
        .upload(fileName, selectedFile)

      setUploading(false)

      if (error) {
        console.error('Upload error:', error)
        setErrorMessage(`Upload failed: ${error.message}`)
        return
      }

      setUploadSuccess('File uploaded successfully.')
      setSelectedFile(null)
    } catch (uploadError: any) {
      console.error('Unexpected upload error:', uploadError)
      setUploading(false)
      setErrorMessage(`An unexpected error occurred: ${uploadError.message}`)
    }
  }

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
      {errorMessage && <p className="text-red-500 mb-2">{errorMessage}</p>}
      {uploadSuccess && <p className="text-green-500 mb-2">{uploadSuccess}</p>}
      <input
        type="file"
        accept=".doc,.docx,.odt,.odf,.txt"
        onChange={handleFileChange}
        className="mb-4"
      />
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  )
}

export default FileUpload
