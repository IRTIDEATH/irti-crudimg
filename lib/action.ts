"use server"

import {z} from 'zod'
import {prisma} from "@/lib/prisma"
import {put, del} from "@vercel/blob"

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getImageById } from './data'

const uploadSchema = z.object({
    title: z.string().min(1),
    image: z
        .instanceof(File)
        // user harus memasukan filenya
        .refine((file) => file.size > 0, {message: "Image is required"})

        // cek file type. Contoh : image/png
        // mengizinkan semua tipe image dan jika bukan image maka akan mengirim message
        // jika file kosong maka message ini tidak akan ditampilkan
        .refine((file) => file.size === 0 || file.type.startsWith("image/"), {message: "Only images are allowed"})

        // batas kirim adalah sebesar 4MB. lebih dari itu akan mengirimkan pesan
        .refine((file) => file.size < 4000000, {message: "Image must less than 4MB"}),

})

const EditSchema = z.object({
    title: z.string().min(1),
    image: z
        .instanceof(File)

        // cek file type. Contoh : image/png
        // mengizinkan semua tipe image dan jika bukan image maka akan mengirim message
        // jika file kosong maka message ini tidak akan ditampilkan
        .refine((file) => file.size === 0 || file.type.startsWith("image/"), {message: "Only images are allowed"})

        // batas kirim adalah sebesar 4MB. lebih dari itu akan mengirimkan pesan
        .refine((file) => file.size < 4000000, {message: "Image must less than 4MB"})

        // user boleh mengkosongkan image
        .optional(),

})


// tambahkan prevState dan kasih type unknown atau any agar formAction yang ada di create-form tidak error
export const uploadImage = async (prevState: unknown, formData: FormData) => {
    const validatedFields = uploadSchema.safeParse(
        Object.fromEntries(formData.entries())
    )

    // jika gagal
    if(!validatedFields.success) {
        return {
            error: validatedFields.error.flatten().fieldErrors
        }
    }

    const {title, image} = validatedFields.data
    const {url} = await put(image.name, image, {
        access: "public",
        multipart: true
    })

    // data nya ngambil dari const {title, }
    // untuk data si image itu ngambil dari const {url}
    try {
        await prisma.upload.create({
            data:{
                title,
                image: url
            }
        })
    } catch (error) {
        return {message: "Failed to create data"}
    }

    // setelah uploadnya selesai dan setelah tersimpan ke database, Kita perlu revalidate pathnya dan akan redirect ke Home Page

    revalidatePath("/")
    redirect("/")
}


export const deleteImage = async (id: string) => {
    const data = await getImageById(id)
    if(!data) return {message: "No data found"}

    // di delete image yang ada di blob
    await del(data.image)

    // lalu delete image yang ada di database
    try {
        await prisma.upload.delete({
            where:{id}
        })
    } catch (error) {
        return {message: "Failed to delete data"}
    }

    revalidatePath("/")
}


export const updateImage = async (id:string, prevState: unknown, formData: FormData) => {
    const validatedFields = EditSchema.safeParse(
        Object.fromEntries(formData.entries())
    )

    // jika gagal
    if(!validatedFields.success) {
        return {
            error: validatedFields.error.flatten().fieldErrors
        }
    }

    const data = await getImageById(id)
    if(!data) return {message: "No Data Found"}

    const {title, image} = validatedFields.data
    let imagePath
    // Jika user mengupdate tanpa image, maka imagepathnya ngambil dari data.image
    if(!image || image.size <= 0){
        imagePath = data.image
    } else {
        // jika user update data dengan image, hapus img lama dan adain img baru
        await del(data.image)

        // disaat img yang baru berhasil terupload set img path nya dengan {url} dari img yang baru di upload
        const {url} = await put(image.name, image, {
            access: "public",
            multipart: true
        })
        imagePath = url
    }

    // nah kemudian barulah update datanya yang di database
    // untuk data image itu ngambilnya dari imagepath bukan url lagi
    try {
        await prisma.upload.update({
            data:{
                title,
                image: imagePath
            },
            where:{id}
        })
    } catch (error) {
        return {message: "Failed to update data"}
    }

    // setelah uploadnya selesai dan setelah tersimpan ke database, Kita perlu revalidate pathnya dan akan redirect ke Home Page

    revalidatePath("/")
    redirect("/")
}